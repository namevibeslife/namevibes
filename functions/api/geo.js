// Visitor's country via Cloudflare's edge geolocation (ISO 3166-1 alpha-2), used to
// default the country picker at sign-up. No IP addresses are stored or returned.
export function onRequestGet({ request }) {
  const country = request.cf?.country || null;
  return new Response(JSON.stringify({ country }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
