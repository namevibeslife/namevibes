// AWS Signature Version 4 (what Cloudflare R2's S3 API uses). Pure Web Crypto, so it runs in Cloudflare Pages
// Functions, Node and the browser. Checked against the worked example in AWS's documentation (see scripts/test-storage.mjs).
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const sha256Hex = async (data) => hex(await crypto.subtle.digest('SHA-256', typeof data === 'string' ? enc.encode(data) : data));
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}
async function signingKey(secret, date, region, service) {
  let k = await hmac(enc.encode(`AWS4${secret}`), date);
  k = await hmac(k, region); k = await hmac(k, service);
  return hmac(k, 'aws4_request');
}
const rfc3986 = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
export const encodePath = (p) => p.split('/').map(rfc3986).join('/');
const stamp = (now) => new Date(now).toISOString().replace(/[:-]|\.\d{3}/g, ''); // 20130524T000000Z

/** Query-string signed GET/HEAD/... URL that anyone can use until it expires (no login). */
export async function presignUrl({ method = 'GET', host, path, accessKeyId, secretAccessKey, region = 'auto', service = 's3', expires = 86400, now = Date.now() }) {
  const amz = stamp(now); const date = amz.slice(0, 8); const scope = `${date}/${region}/${service}/aws4_request`;
  const q = { 'X-Amz-Algorithm': 'AWS4-HMAC-SHA256', 'X-Amz-Credential': `${accessKeyId}/${scope}`, 'X-Amz-Date': amz, 'X-Amz-Expires': String(expires), 'X-Amz-SignedHeaders': 'host' };
  const query = Object.keys(q).sort().map((k) => `${rfc3986(k)}=${rfc3986(q[k])}`).join('&');
  const canonical = [method, encodePath(path), query, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', amz, scope, await sha256Hex(canonical)].join('\n');
  const sig = hex(await hmac(await signingKey(secretAccessKey, date, region, service), toSign));
  return `https://${host}${encodePath(path)}?${query}&X-Amz-Signature=${sig}`;
}

/** Authorization headers for a normal request (PUT/DELETE/HEAD/GET) with a known payload hash. */
export async function signHeaders({ method, host, path, payloadHash, accessKeyId, secretAccessKey, region = 'auto', service = 's3', now = Date.now() }) {
  const amz = stamp(now); const date = amz.slice(0, 8); const scope = `${date}/${region}/${service}/aws4_request`;
  const signed = 'host;x-amz-content-sha256;x-amz-date';
  const canonical = [method, encodePath(path), '', `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amz}\n`, signed, payloadHash].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', amz, scope, await sha256Hex(canonical)].join('\n');
  const sig = hex(await hmac(await signingKey(secretAccessKey, date, region, service), toSign));
  return { 'x-amz-date': amz, 'x-amz-content-sha256': payloadHash, Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${sig}` };
}
