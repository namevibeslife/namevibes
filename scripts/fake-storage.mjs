// Fake Supabase Storage and Cloudflare R2 (S3 API) servers for the tests: one fetch() that answers like both, with switches
// for outages and hangs and a controllable clock for signed-link expiry. No network, no real account.
export function makeFakeCloud({ clock = { t: Date.now() } } = {}) {
  const state = { sb: new Map(), r2: new Map(), sbDown: false, sentBearer: false, needBearer: false, r2Down: false, sbHang: false, r2Hang: false, calls: [], tokens: new Map() };
  const KEY = 'sb_secret_svc-key-secret'; // the new-style Supabase key format (not a JWT)
  const hang = (init) => new Promise((_, reject) => init.signal?.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; reject(e); }));
  const bytesOf = (b) => (b instanceof Uint8Array ? new Uint8Array(b) : new Uint8Array(Buffer.from(String(b || ''))));
  const respond = (status, body, headers = {}) => new Response(body ?? null, { status, headers });

  async function fetch(url, init = {}) {
    const u = new URL(url); const method = (init.method || 'GET').toUpperCase();
    state.calls.push(`${method} ${u.host}${u.pathname}`);
    if (u.host === 'sb.test') {
      if (state.sbHang) return hang(init);
      if (state.sbDown) return respond(503, 'down');
      const p = decodeURIComponent(u.pathname.replace('/storage/v1/', ''));
      const signedGet = p.startsWith('object/sign/') && method === 'GET';
      if (!signedGet && init.headers?.apikey !== KEY) return respond(401, 'unauthorised');
      if (!signedGet && state.needBearer && !init.headers?.Authorization) return respond(400, JSON.stringify({ message: "headers must have required property 'authorization'" }));
      if (!signedGet && init.headers?.Authorization) { state.sentBearer = true; } // recorded so a test can assert it is NOT sent for sb_secret_ keys
      let m;
      if ((m = /^bucket\/(.+)$/.exec(p))) return respond(m[1] === 'prints' ? 200 : 404, JSON.stringify({ id: m[1], public: false }));
      if ((m = /^object\/sign\/([^/]+)\/(.+)$/.exec(p))) {
        if (method === 'POST') { const tok = `t${state.tokens.size + 1}`; state.tokens.set(tok, { key: m[2], exp: clock.t + JSON.parse(init.body).expiresIn * 1000 }); return respond(200, JSON.stringify({ signedURL: `/object/sign/${m[1]}/${m[2]}?token=${tok}` })); }
        const t = state.tokens.get(u.searchParams.get('token'));
        if (!t || t.key !== m[2] || t.exp < clock.t) return respond(400, 'expired or invalid');
        const f = state.sb.get(m[2]); return f ? respond(200, f.bytes, { 'content-type': f.type }) : respond(404, 'nope');
      }
      if ((m = /^object\/authenticated\/([^/]+)\/(.+)$/.exec(p))) { const f = state.sb.get(m[2]); return !f ? respond(404, 'nope') : method === 'HEAD' ? respond(200) : respond(200, f.bytes, { 'content-type': f.type }); }
      if ((m = /^object\/([^/]+)\/(.+)$/.exec(p))) {
        if (method === 'POST') { state.sb.set(m[2], { bytes: bytesOf(init.body), type: init.headers['Content-Type'] }); return respond(200, '{}'); }
        if (method === 'DELETE') { state.sb.delete(m[2]); return respond(200, '{}'); }
      }
      return respond(404, 'unknown');
    }
    if (u.host.endsWith('.r2.cloudflarestorage.com')) {
      if (state.r2Hang) return hang(init);
      if (state.r2Down) return respond(500, 'down');
      const presigned = u.searchParams.get('X-Amz-Signature');
      if (presigned) { // a presigned link: valid until X-Amz-Date + X-Amz-Expires
        const d = u.searchParams.get('X-Amz-Date'); const start = Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), +d.slice(9, 11), +d.slice(11, 13), +d.slice(13, 15));
        if (clock.t > start + Number(u.searchParams.get('X-Amz-Expires')) * 1000) return respond(403, 'expired');
      } else if (!/^AWS4-HMAC-SHA256 Credential=R2AK\//.test(init.headers?.Authorization || '')) return respond(403, 'no signature');
      const [, bucket, ...rest] = decodeURIComponent(u.pathname).split('/'); const key = rest.join('/');
      if (bucket !== 'prints-r2') return respond(404, 'no bucket');
      if (!key) return respond(200);
      if (method === 'PUT') { state.r2.set(key, { bytes: bytesOf(init.body), type: init.headers['Content-Type'] }); return respond(200); }
      if (method === 'DELETE') { state.r2.delete(key); return respond(204); }
      const f = state.r2.get(key);
      return !f ? respond(404, 'nope') : method === 'HEAD' ? respond(200) : respond(200, f.bytes, { 'content-type': f.type });
    }
    return respond(404, 'unknown host');
  }
  const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_ROLE_KEY: KEY, SUPABASE_BUCKET: 'prints', R2_ACCOUNT_ID: 'acct', R2_ACCESS_KEY_ID: 'R2AK', R2_SECRET_ACCESS_KEY: 'r2-secret-value', R2_BUCKET: 'prints-r2' };
  return { fetch, state, env, clock, secrets: [KEY, 'r2-secret-value'] };
}

/** A small valid PNG header (signature + IHDR) padded to `size` bytes, with the given pixel width/height. */
export function fakePng(width = 2400, height = 3200, size = 300) {
  const b = new Uint8Array(size);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const v = new DataView(b.buffer); v.setUint32(16, width); v.setUint32(20, height);
  for (let i = 33; i < size; i++) b[i] = (i * 7 + width) & 255;
  return b;
}
