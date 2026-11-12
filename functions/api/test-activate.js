// TEST PAYMENTS ONLY. When the Cloudflare variable TEST_PAYMENTS is "true", a signed-in user can
// activate a plan without paying, so testers can walk the whole flow. The plan is written here,
// on the server, so the Firestore security rules stay locked. Remove the variable to switch it off.
const API_KEY = 'AIzaSyAkU1zvysoWojve9q9v-jDJWUITbFSnIdc'; // public Firebase web key
const PLANS = ['individual', 'family'];

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

const b64url = (data) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function getAccessToken(account) {
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
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${b64url(signature)}`
    })
  });
  if (!res.ok) throw new Error('Could not get a Google access token');
  return (await res.json()).access_token;
}

export async function onRequestPost({ request, env }) {
  if (env.TEST_PAYMENTS !== 'true') return json({ error: 'Test payments are off' }, 403);
  if (!env.FIREBASE_SERVICE_ACCOUNT) return json({ error: 'Server is not set up for test payments' }, 500);

  const idToken = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
  if (!idToken) return json({ error: 'Not signed in' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const { planType, currency, referralCode } = body;
  const amount = Number(body.amount);
  if (!PLANS.includes(planType) || !Number.isFinite(amount) || amount < 0) return json({ error: 'Bad plan' }, 400);

  // Who is asking? Ask Firebase to verify the sign-in token.
  const who = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });
  if (!who.ok) return json({ error: 'Invalid sign-in' }, 401);
  const user = (await who.json()).users?.[0];
  if (!user) return json({ error: 'Invalid sign-in' }, 401);

  try {
    const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
    const token = await getAccessToken(account);
    const base = `https://firestore.googleapis.com/v1/projects/${account.project_id}/databases/(default)/documents`;
    const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const now = new Date();
    const renewal = new Date(now);
    renewal.setFullYear(renewal.getFullYear() + 1);
    const ts = (d) => ({ timestampValue: d.toISOString() });
    const ref = referralCode ? { stringValue: String(referralCode) } : { nullValue: null };

    const fields = {
      planType: { stringValue: planType },
      planActive: { booleanValue: true },
      paidAmount: Number.isInteger(amount) ? { integerValue: String(amount) } : { doubleValue: amount },
      paidAt: ts(now),
      planExpiry: ts(renewal),
      renewalDate: ts(renewal),
      referralCode: ref
    };
    const mask = Object.keys(fields).map((f) => `updateMask.fieldPaths=${f}`).join('&');
    const update = await fetch(`${base}/users/${user.localId}?${mask}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ fields })
    });
    if (!update.ok) return json({ error: 'Could not activate the plan' }, 502);

    await fetch(`${base}/payments?documentId=${user.localId}_${Date.now()}`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        fields: {
          userId: { stringValue: user.localId },
          userEmail: { stringValue: user.email || '' },
          planType: { stringValue: planType },
          amount: fields.paidAmount,
          currency: { stringValue: currency || 'INR' },
          gateway: { stringValue: 'test' },
          transactionId: { stringValue: `test_${Date.now()}` },
          referralCode: ref,
          status: { stringValue: 'success' },
          createdAt: ts(now)
        }
      })
    });
    return json({ ok: true });
  } catch (error) {
    return json({ error: 'Test payment failed' }, 500);
  }
}
