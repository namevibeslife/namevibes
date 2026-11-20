// Shared helpers for the payment functions (functions/api/pay/*). Not a route: no onRequest export.
// Everything that decides money (price, currency, gateway, referral discount) is computed HERE from
// Firestore, never from what the browser sends.
import { getPricing, DEFAULT_REFERRAL_DISCOUNT } from '../../src/data/countries.js';
import { readPlanSettings, discountedPrice } from '../../src/utils/planMath.js';
import { resolveGateway, currencyExponent, toSubunits, toGatewayAmount, GATEWAY_OVERRIDES } from '../../src/data/gatewayCurrencies.js';

const FIREBASE_WEB_KEY = 'AIzaSyAkU1zvysoWojve9q9v-jDJWUITbFSnIdc'; // public Firebase web key (same as test-activate)
export const PLAN_TYPE = 'family'; // the one NAMASUTRA Annual Plan is stored as 'family'

export const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

// ---- Firebase sign-in + Firestore (service account, REST) -----------------------------------------

const b64url = (data) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function accessToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }))}`;
  const pem = account.private_key.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${b64url(signature)}` })
  });
  if (!res.ok) throw new Error('Could not get a Google access token');
  return (await res.json()).access_token;
}

// Who is calling? Firebase verifies the ID token. Returns { uid, email } or null.
export async function signedInUser(request) {
  const idToken = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
  if (!idToken) return null;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });
  if (!res.ok) return null;
  const user = (await res.json()).users?.[0];
  return user ? { uid: user.localId, email: user.email || '' } : null;
}

// Firestore REST value <-> plain JS
const decodeValue = (v) => {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  return null;
};
const decodeFields = (fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]));
export const encodeValue = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  return { stringValue: String(v) };
};

export async function firestore(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const token = await accessToken(account);
  const base = `https://firestore.googleapis.com/v1/projects/${account.project_id}/databases/(default)/documents`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  return {
    // -> { data, updateTime } or null when the document does not exist
    async get(path) {
      const res = await fetch(`${base}/${path}`, { headers });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Firestore read failed (${res.status})`);
      const doc = await res.json();
      return { data: decodeFields(doc.fields || {}), updateTime: doc.updateTime };
    },
    async list(collectionPath) {
      const out = [];
      let pageToken = '';
      do {
        const res = await fetch(`${base}/${collectionPath}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, { headers });
        if (!res.ok) throw new Error(`Firestore list failed (${res.status})`);
        const body = await res.json();
        (body.documents || []).forEach((d) => out.push(decodeFields(d.fields || {})));
        pageToken = body.nextPageToken || '';
      } while (pageToken);
      return out;
    },
    // Create a document; fails (409) if the id exists
    async create(collectionPath, id, data) {
      const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encodeValue(v)]));
      const res = await fetch(`${base}/${collectionPath}?documentId=${encodeURIComponent(id)}`, { method: 'POST', headers, body: JSON.stringify({ fields }) });
      if (!res.ok) throw new Error(`Firestore create failed (${res.status})`);
    },
    // Merge fields into a document. `ifUpdateTime` makes the write fail if someone else changed it first.
    async patch(path, data, { ifUpdateTime } = {}) {
      const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encodeValue(v)]));
      const mask = Object.keys(fields).map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
      const pre = ifUpdateTime ? `&currentDocument.updateTime=${encodeURIComponent(ifUpdateTime)}` : '';
      const res = await fetch(`${base}/${path}?${mask}${pre}`, { method: 'PATCH', headers, body: JSON.stringify({ fields }) });
      if (!res.ok) {
        const err = new Error(`Firestore write failed (${res.status})`);
        err.status = res.status;
        throw err;
      }
    }
  };
}

// ---- What this user must pay, computed on the server ----------------------------------------------

const normaliseCode = (c) => String(c || '').trim().toUpperCase().replace(/\s+/g, '');

/**
 * { countryCode, currency, listPrice, amount, discountPercent, referralCode, gateway, via }
 * `gateway` is null when neither Razorpay nor PayPal can take the currency (checkout blocked).
 */
export async function priceForUser(db, uid) {
  const user = await db.get(`users/${uid}`);
  if (!user) throw new Error('No profile');
  const profile = user.data;
  const countryCode = String(profile.countryCode || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) throw new Error('No country on profile');

  // Same source as the Pricing page: the active countrySettings entry, else the built-in defaults
  const settings = (await db.list('countrySettings')).find((s) => s.countryCode === countryCode && s.isActive);
  let plan;
  let currency;
  let override = 'auto';
  if (settings) {
    plan = readPlanSettings(settings, getPricing(countryCode).currency);
    currency = plan.currency;
    if (GATEWAY_OVERRIDES.includes(settings.gatewayOverride)) override = settings.gatewayOverride;
  } else {
    const base = getPricing(countryCode);
    currency = base.currency;
    plan = { price: base.price, discountPercent: DEFAULT_REFERRAL_DISCOUNT };
  }

  // The discount applies only to a referral code that really exists and is active
  let referralCode = null;
  const claimed = normaliseCode(profile.referralCodeUsed || profile.referralCode);
  if (claimed) {
    const ref = await db.get(`referralCodes/${claimed}`);
    if (ref && ref.data.active === true) referralCode = profile.referralCodeUsed || profile.referralCode;
  }
  const amount = referralCode ? discountedPrice(plan) : plan.price;

  const flag = await db.get('paymentSettings/razorpay');
  const internationalEnabled = flag?.data?.internationalEnabled === true;
  const choice = resolveGateway({ currency, override, internationalEnabled });

  return {
    countryCode, currency, listPrice: plan.price, amount, discountPercent: plan.discountPercent,
    referralCode, gateway: choice.gateway, via: choice.via, userEmail: profile.email || ''
  };
}

// ---- Activating the plan (only ever called after a gateway-verified payment) ------------------------

export async function activatePlan(db, { uid, email, order, gateway, transactionId }) {
  const now = new Date();
  const renewal = new Date(now);
  renewal.setFullYear(renewal.getFullYear() + 1);
  await db.patch(`users/${uid}`, {
    planType: PLAN_TYPE,
    planActive: true,
    paidAmount: order.amount,
    paidAt: now,
    planExpiry: renewal,
    renewalDate: renewal,
    referralCode: order.referralCode || null
  });
  await db.create('payments', `${uid}_${Date.now()}`, {
    userId: uid,
    userEmail: email || '',
    planType: PLAN_TYPE,
    amount: order.amount,
    currency: order.currency,
    gateway,
    transactionId,
    orderId: order.orderId,
    referralCode: order.referralCode || null,
    countryCode: order.countryCode || null,
    status: 'success',
    createdAt: now
  });
}

// Claim an order exactly once: a second verify for the same order (double click, retry, replay)
// finds it already paid, or loses the updateTime race, and does not activate or record twice.
export async function claimOrder(db, orderId, uid) {
  const found = await db.get(`paymentOrders/${orderId}`);
  if (!found || found.data.uid !== uid) return { error: 'Unknown order', status: 404 };
  if (found.data.status === 'paid') return { already: true, order: found.data };
  try {
    await db.patch(`paymentOrders/${orderId}`, { status: 'verifying' }, { ifUpdateTime: found.updateTime });
  } catch (e) {
    return { error: 'This payment is already being processed', status: 409 };
  }
  return { order: found.data };
}

export { currencyExponent, toSubunits, toGatewayAmount };
