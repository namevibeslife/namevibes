// Tells the app whether test payments are switched on (Cloudflare variable TEST_PAYMENTS = "true").
export function onRequestGet({ env }) {
  return new Response(JSON.stringify({ testMode: env.TEST_PAYMENTS === 'true' }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
