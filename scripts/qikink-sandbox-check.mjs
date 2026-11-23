// Qikink SANDBOX check with fake mug orders. Sandbox only: it refuses to run in any other mode, never touches live,
// never prints a secret, and writes a plain-English report to docs/qikink-sandbox-report.md.
//
//   1. Put the two sandbox values in a file called .env.local in the project folder (it is ignored by Git), one per line:
//        QIKINK_CLIENT_ID=your-client-id
//        QIKINK_CLIENT_SECRET=your-sandbox-secret
//      (or set them in the terminal for this session only). Do not paste them anywhere else.
//   2. node scripts/qikink-sandbox-check.mjs
//
// Optional settings: QIKINK_TEST_SKU (default UWCM-Wh-11 OZ, the white 11 oz mug), QIKINK_TEST_DESIGN_URL and
// QIKINK_TEST_DESIGN_URL_OFFCENTRE (public https PNGs; default: a public-domain demo PNG with no personal data),
// QIKINK_TEST_PRINT_TYPE (default 5), QIKINK_TEST_PLACEMENT (default fr), QIKINK_TEST_STATE (default Maharashtra),
// QIKINK_TEST_CANVAS (default 8.5x3.5 inches, the mug print area we are testing).
// The sandbox has no working order-list/tracking API; that is a known limit, not a failure.
import fs from 'node:fs';
import { QikinkAdapter, buildOrderPayload } from '../src/merch/providers/qikink.js';

// ---- .env.local (never printed) ----------------------------------------------------------------------------------------
if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const env = process.env;
const REPORT = 'docs/qikink-sandbox-report.md';
const mode = env.QIKINK_ENV || 'sandbox';
if (mode !== 'sandbox') { console.error(`Refusing to run: QIKINK_ENV=${mode}. This check is sandbox only.`); process.exit(2); }

const id = env.QIKINK_CLIENT_ID; const secret = env.QIKINK_CLIENT_SECRET;
const sku = env.QIKINK_TEST_SKU || 'UWCM-Wh-11 OZ';
const DEMO_PNG = 'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png'; // public domain, no personal data
const url = env.QIKINK_TEST_DESIGN_URL || DEMO_PNG;
const urlOff = env.QIKINK_TEST_DESIGN_URL_OFFCENTRE || url;
const printType = Number(env.QIKINK_TEST_PRINT_TYPE || 5);
const placement = env.QIKINK_TEST_PLACEMENT || 'fr';
const [cw, ch] = String(env.QIKINK_TEST_CANVAS || '8.5x3.5').split('x').map(Number);

if (!id || !secret) {
  const text = `# Qikink sandbox report

**Status: NOT RUN YET.** The sandbox Client ID and Secret are not available on this computer (they are saved in Cloudflare, which cannot be read from here).

## What you need to do (about 3 minutes, no coding)

1. In the project folder \`C:\\Users\\sresq\\Documents\\namevibes\` create a new text file named exactly \`.env.local\` (a dot at the start; if Windows adds \`.txt\`, rename it).
2. Put these two lines in it, with your own values from the Qikink dashboard (Integrations -> Open API, the **sandbox** secret):

\`\`\`
QIKINK_CLIENT_ID=paste-your-client-id-here
QIKINK_CLIENT_SECRET=paste-your-sandbox-secret-here
\`\`\`

3. Save it. The file is ignored by Git, so it is never uploaded. Do not paste the values in a chat.
4. Run \`node scripts/qikink-sandbox-check.mjs\` (or ask Claude Code to). It talks only to \`https://sandbox.qikink.com\`, places three **fake** mug orders (nothing is printed or shipped, nothing is charged) and replaces this file with the results.

## What it will test

- Getting an access token, and getting a fresh one (refresh).
- A white 11 oz mug (\`${sku}\`) with print type **${printType}** and placement **${placement}**, print area ${cw} x ${ch} inches: one centred design and one off-centre design.
- A control order with print type 1, so that if type ${printType} is refused we can see which type Qikink does accept.
- It reports the exact words of any Qikink error.

The order-list and tracking calls do not work in the sandbox (Qikink says so); that is not treated as a failure.
`;
  const keep = fs.existsSync(REPORT) && /RESULT: RUN/.test(fs.readFileSync(REPORT, 'utf8'));
  if (!keep) fs.writeFileSync(REPORT, text);
  console.error(`Not run: ${[!id && 'QIKINK_CLIENT_ID', !secret && 'QIKINK_CLIENT_SECRET'].filter(Boolean).join(' and ')} not set.${keep ? ' (An earlier real report was kept.)' : ' A step-by-step note was written to ' + REPORT + '.'}`);
  process.exit(2);
}

// ---- masking: no secret, token or id ever reaches the screen, the report or the JSON ---------------------------------------
let secretsToHide = [id, secret];
const mask = (v) => { let s = typeof v === 'string' ? v : JSON.stringify(v, null, 2); for (const x of secretsToHide) if (x && x.length > 3) s = s.split(x).join('****'); return s; };
const tail = (t) => (t ? `****${String(t).slice(-4)}` : 'none');

const adapter = new QikinkAdapter('qikink', { clientId: id, clientSecret: secret, env: 'sandbox' });
const results = []; const log = [];
const say = (s) => { log.push(s); console.log(mask(s)); };

// 1. token fetch and refresh
let tokenInfo = { fetched: false, refreshed: false, same: null, error: null };
try {
  const t1 = await adapter.accessToken();
  secretsToHide.push(t1);
  tokenInfo.fetched = !!t1;
  const t2 = await adapter.accessToken({ force: true });
  secretsToHide.push(t2);
  tokenInfo.refreshed = !!t2; tokenInfo.same = t1 === t2;
  say(`Token fetch: OK (${tail(t1)}). Refresh: OK (${tail(t2)}, ${t1 === t2 ? 'same token' : 'a new token'}).`);
} catch (e) { tokenInfo.error = e.message; say(`Token: FAILED (${e.message}).`); }

// 2. fake mug orders
const address = { name: 'Sandbox Test', phone: '9999999999', line1: '1 Test Road', city: 'Pune', state: env.QIKINK_TEST_STATE || 'Maharashtra', postalCode: '411001', country: 'IN' };
const cases = [
  { key: 'mug-centred', title: `Mug ${cw} x ${ch} in, design centred, print type ${printType}, placement ${placement}`, type: printType, design: url },
  { key: 'mug-offcentre', title: `Mug ${cw} x ${ch} in, design off-centre, print type ${printType}, placement ${placement}`, type: printType, design: urlOff },
  { key: 'control-type-1', title: 'Control: same mug with print type 1 (to learn which type Qikink accepts)', type: 1, design: url }
];
if (tokenInfo.fetched) {
  for (const c of cases) {
    const order = {
      orderId: `sbx${c.key.replace(/[^a-z0-9]/g, '').slice(0, 5)}${Date.now().toString(36)}`, attempt: 1, email: 'sandbox-test@example.com', totalValue: 1, address,
      items: [{ index: 0, qty: 1, unitPrice: 1, designUrl: c.design, mockupUrl: c.design, designSha256: 'f'.repeat(64), canvasInches: { width: cw, height: ch }, placementSku: placement, printTypeId: c.type, providerSku: { sku, printTypeId: c.type } }]
    };
    const built = buildOrderPayload(order);
    const r = await adapter.submitOrder(order);
    results.push({ ...c, orderNumber: built.orderNumber, payload: built.payload, ok: r.ok, providerOrderId: r.providerOrderId, error: r.error, retryable: r.retryable });
    say(`${r.ok ? 'ACCEPTED' : 'REJECTED'}: ${c.title}${r.ok ? ` (Qikink order ${r.providerOrderId})` : ` -> ${r.error}`}`);
  }
}

// ---- report in plain English ---------------------------------------------------------------------------------------------------
const row = (r) => `| ${r.title} | ${r.ok ? 'Accepted' : 'Rejected'} | ${r.ok ? `order ${r.providerOrderId}` : `"${String(r.error).replace(/\|/g, '/')}"`} |`;
const main = results.filter((r) => r.type === printType);
const accepted5 = main.length > 0 && main.every((r) => r.ok);
const control = results.find((r) => r.key === 'control-type-1');
const verdict = !tokenInfo.fetched ? `Qikink did not give us an access token (${tokenInfo.error}). Nothing else could be tested. Check that the Client ID and the **sandbox** secret are right.`
  : accepted5 ? `Qikink's sandbox ACCEPTED print type ${printType} with placement "${placement}" for the mug (${sku}), both centred and off-centre.`
  : `Qikink's sandbox did NOT accept print type ${printType} with placement "${placement}" for ${sku}. ${control?.ok ? 'The control order with print type 1 was accepted, so type 1 is the one to use for this SKU.' : 'The control order with print type 1 was also rejected, so the cause may be something other than the print type (read the exact error text below).'}`;
const text = `# Qikink sandbox report

**RESULT: RUN** on ${new Date().toISOString()} against https://sandbox.qikink.com only (never live; nothing printed, shipped or charged).

## In short

${verdict}

## Details

- Access token: ${tokenInfo.fetched ? 'received' : 'FAILED'}. Refresh: ${tokenInfo.refreshed ? `worked (${tokenInfo.same ? 'Qikink returned the same token' : 'a new token was issued, as Qikink documents: it replaces the old one'})` : 'not tested'}.
- Product: \`${sku}\` (white 11 oz mug), print area tested ${cw} x ${ch} inches, delivery to Pune, India. Payment type is always "Prepaid".

| Test | Result | Qikink said |
|---|---|---|
${results.map(row).join('\n')}

## The exact order sent (no secrets are in an order)

${results.map((r) => `### ${r.title}\n\n\`\`\`json\n${mask(r.payload)}\n\`\`\``).join('\n\n')}

## Notes

- The order-list and tracking calls do not work in the sandbox (documented by Qikink), so tracking cannot be tested here. That is not a failure.
- A design in the sandbox is not printed, so this does not prove where the design lands on a real mug. That needs a physical sample.
- The design image URL used: ${url}${url === DEMO_PNG ? ' (a public-domain demo image with no personal data)' : ''}.
`;
fs.writeFileSync(REPORT, mask(text));
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/qikink-sandbox-results.json', mask({ at: new Date().toISOString(), env: 'sandbox', token: tokenInfo, results: results.map(({ payload, ...r }) => r) }));
console.log(`\nReport written to ${REPORT}`);
process.exit(tokenInfo.fetched && results.length ? 0 : 1);
