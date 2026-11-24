// Where customer print files and mock-ups are kept (NOT Firebase Storage: that needs the paid plan).
// Same pattern as the print-provider adapters: one small interface, several implementations, one wrapper that fails over.
//   FileStore: put(key, bytes, type) / getSignedUrl(key, ttl) / get(key) / exists(key) / delete(key) / health()
//   SupabaseStore (Storage REST, private bucket, service-role key), R2Store (Cloudflare R2 S3 API, SigV4), MockStore (tests + dev:mock)
//   FailoverStore: primary then secondary (8 s timeout each), optional mirror to both.
// Missing configuration = backend "not-configured"; it never throws at construction and never prints a secret.
import { presignUrl, signHeaders, sha256Hex, encodePath } from './sigv4.js';

export const PUT_TIMEOUT_MS = 8000;
const hexOf = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const sha256Bytes = async (bytes) => hexOf(await crypto.subtle.digest('SHA-256', bytes));
// Only files under merch/print/ and merch/mockup/ can ever be written, read or deleted through this layer.
export const validKey = (k) => /^merch\/(print|mockup)\/[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_.-]{1,80}\.png$/.test(String(k));
const safeKey = (key) => { if (!validKey(key)) throw new Error('bad-key'); return key; };

async function timed(fetchFn, url, init, ms) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try { return await fetchFn(url, { ...init, signal: ctl.signal }); }
  catch (e) { throw new Error(e?.name === 'AbortError' ? 'timeout' : 'network'); }
  finally { clearTimeout(timer); }
}

export class SupabaseStore {
  constructor({ url, serviceKey, bucket, fetch: f, timeoutMs = PUT_TIMEOUT_MS } = {}) {
    this.name = 'supabase';
    this.url = String(url || '').replace(/\/+$/, '');
    this.serviceKey = serviceKey;
    this.bucket = bucket;
    this.fetch = f || ((...a) => globalThis.fetch(...a));
    this.timeoutMs = timeoutMs;
  }
  configured() { return !!(this.url && this.serviceKey && this.bucket); }
  // Supabase's new-style keys (sb_secret_...) are NOT JWTs: they go in the apikey header only (the gateway turns them into a short-lived
  // token for Storage). The legacy service_role key is a JWT (starts with "eyJ") and is also sent as a Bearer token.
  headers(extra = {}) {
    const legacyJwt = String(this.serviceKey || '').startsWith('eyJ');
    return { apikey: this.serviceKey, ...(legacyJwt ? { Authorization: `Bearer ${this.serviceKey}` } : {}), ...extra };
  }
  /** The address without any signature: must be refused (the bucket is private). */
  publicUrl(key) { return `${this.url}/storage/v1/object/public/${this.bucket}/${encodePath(safeKey(key))}`; }
  obj(key, kind = '') { return `${this.url}/storage/v1/object/${kind}${this.bucket}/${encodePath(key)}`; }
  async put(key, bytes, contentType = 'image/png') {
    const r = await timed(this.fetch, this.obj(safeKey(key)), { method: 'POST', headers: this.headers({ 'Content-Type': contentType, 'x-upsert': 'true' }), body: bytes }, this.timeoutMs);
    if (!r.ok) throw new Error(`supabase-put-${r.status}`);
  }
  async get(key) {
    const r = await timed(this.fetch, this.obj(safeKey(key), 'authenticated/'), { headers: this.headers() }, this.timeoutMs * 3);
    if (r.status === 404 || r.status === 400) return null;
    if (!r.ok) throw new Error(`supabase-get-${r.status}`);
    return { bytes: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get('content-type') || 'image/png' };
  }
  async exists(key) {
    const r = await timed(this.fetch, this.obj(safeKey(key), 'authenticated/'), { method: 'HEAD', headers: this.headers() }, this.timeoutMs);
    if (r.status === 404 || r.status === 400) return false;
    if (!r.ok) throw new Error(`supabase-head-${r.status}`);
    return true;
  }
  async getSignedUrl(key, ttlSeconds = 86400) {
    const r = await timed(this.fetch, this.obj(safeKey(key), 'sign/'), { method: 'POST', headers: this.headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ expiresIn: ttlSeconds }) }, this.timeoutMs);
    if (!r.ok) throw new Error(`supabase-sign-${r.status}`);
    const { signedURL } = await r.json();
    return signedURL.startsWith('http') ? signedURL : `${this.url}/storage/v1${signedURL}`;
  }
  async delete(key) {
    const r = await timed(this.fetch, this.obj(safeKey(key)), { method: 'DELETE', headers: this.headers() }, this.timeoutMs);
    if (!r.ok && r.status !== 404) throw new Error(`supabase-delete-${r.status}`);
  }
  async health() {
    if (!this.configured()) return { status: 'not-configured' };
    try {
      const r = await timed(this.fetch, `${this.url}/storage/v1/bucket/${encodeURIComponent(this.bucket)}`, { headers: this.headers() }, this.timeoutMs);
      if (r.ok) { const info = await r.json().catch(() => ({})); return { status: 'ok', detail: info.public === true ? 'bucket found but it is PUBLIC: make it private' : 'bucket found (private)' }; }
      return { status: 'failing', detail: r.status === 404 ? 'bucket not found' : `HTTP ${r.status}` };
    } catch (e) { return { status: 'failing', detail: e.message }; }
  }
}

export class R2Store {
  constructor({ accountId, accessKeyId, secretAccessKey, bucket, fetch: f, timeoutMs = PUT_TIMEOUT_MS, now = () => Date.now() } = {}) {
    this.name = 'r2';
    this.accountId = accountId;
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.bucket = bucket;
    this.fetch = f || ((...a) => globalThis.fetch(...a));
    this.timeoutMs = timeoutMs;
    this.now = now;
  }
  configured() { return !!(this.accountId && this.accessKeyId && this.secretAccessKey && this.bucket); }
  get host() { return `${this.accountId}.r2.cloudflarestorage.com`; }
  objPath(key) { return `/${this.bucket}/${key}`; }
  async request(method, path, body, extra = {}) {
    const payloadHash = await sha256Hex(body || '');
    const headers = await signHeaders({ method, host: this.host, path, payloadHash, accessKeyId: this.accessKeyId, secretAccessKey: this.secretAccessKey, now: this.now() });
    return timed(this.fetch, `https://${this.host}${encodePath(path)}`, { method, headers: { ...headers, ...extra }, body }, this.timeoutMs);
  }
  async put(key, bytes, contentType = 'image/png') {
    const r = await this.request('PUT', this.objPath(safeKey(key)), bytes, { 'Content-Type': contentType });
    if (!r.ok) throw new Error(`r2-put-${r.status}`);
  }
  async get(key) {
    const r = await this.request('GET', this.objPath(safeKey(key)));
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`r2-get-${r.status}`);
    return { bytes: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get('content-type') || 'image/png' };
  }
  async exists(key) {
    const r = await this.request('HEAD', this.objPath(safeKey(key)));
    if (r.status === 404) return false;
    if (!r.ok) throw new Error(`r2-head-${r.status}`);
    return true;
  }
  publicUrl(key) { return `https://${this.host}${encodePath(this.objPath(safeKey(key)))}`; }
  async getSignedUrl(key, ttlSeconds = 86400) {
    return presignUrl({ method: 'GET', host: this.host, path: this.objPath(safeKey(key)), accessKeyId: this.accessKeyId, secretAccessKey: this.secretAccessKey, expires: ttlSeconds, now: this.now() });
  }
  async delete(key) {
    const r = await this.request('DELETE', this.objPath(safeKey(key)));
    if (!r.ok && r.status !== 404) throw new Error(`r2-delete-${r.status}`);
  }
  async health() {
    if (!this.configured()) return { status: 'not-configured' };
    try {
      const r = await this.request('HEAD', `/${this.bucket}`);
      return r.ok ? { status: 'ok' } : { status: 'failing', detail: `HTTP ${r.status}` };
    } catch (e) { return { status: 'failing', detail: e.message }; }
  }
}

/** In-memory store for tests and `npm run dev:mock`. `down = true` simulates an outage. */
export class MockStore {
  constructor(name = 'mock', { now = () => Date.now() } = {}) { this.name = name; this.files = new Map(); this.down = false; this.now = now; this.puts = 0; }
  configured() { return true; }
  up() { if (this.down) throw new Error('down'); }
  async put(key, bytes, contentType = 'image/png') { this.up(); safeKey(key); this.files.set(key, { bytes: new Uint8Array(bytes), contentType }); this.puts++; }
  async get(key) { this.up(); return this.files.get(key) || null; }
  async exists(key) { this.up(); return this.files.has(key); }
  publicUrl(key) { return `mock://${this.name}/${key}`; } // no ?exp= : the mock fetch refuses it, like a private bucket
  async getSignedUrl(key, ttlSeconds = 86400) { this.up(); return `mock://${this.name}/${key}?exp=${this.now() + ttlSeconds * 1000}`; }
  async delete(key) { this.up(); this.files.delete(key); }
  async health() { return this.down ? { status: 'failing', detail: 'down' } : { status: 'ok' }; }
}

/**
 * `stores`: { supabase?, r2? } (any names work). Settings are read at call time: { primary, mirror, ttlHours }.
 * A stored-file record is { backend, backends[], key, bytes, sha256, createdAt, expiresAt }.
 */
export class FailoverStore {
  constructor({ stores, getSettings = async () => ({}), onEvent = async () => {}, now = () => new Date(), fetch: f } = {}) {
    this.stores = stores;
    this.getSettings = getSettings;
    this.onEvent = onEvent;
    this.now = now;
    this.fetch = f || ((...a) => globalThis.fetch(...a));
  }
  names() { return Object.keys(this.stores).filter((n) => this.stores[n]?.configured()); }
  async order() {
    const settings = await this.getSettings();
    const have = this.names();
    const first = have.includes(settings.primary) ? settings.primary : have.includes('r2') ? 'r2' : have[0];
    return { settings, list: [first, ...have.filter((n) => n !== first)].filter(Boolean) };
  }
  async put(key, bytes, contentType = 'image/png') {
    const { settings, list } = await this.order();
    if (list.length === 0) throw Object.assign(new Error('storage-not-configured'), { code: 'storage-not-configured' });
    const okBackends = [];
    const errors = [];
    for (const name of list) {
      if (okBackends.length > 0 && settings.mirror !== true) break;
      try { await this.stores[name].put(key, bytes, contentType); okBackends.push(name); }
      catch (e) {
        errors.push({ backend: name, error: e.message });
        await this.onEvent({ type: 'failover', from: name, to: list[list.indexOf(name) + 1] || null, error: e.message, at: this.now() }).catch(() => {});
      }
    }
    if (okBackends.length === 0) throw Object.assign(new Error('storage-unavailable'), { code: 'storage-unavailable', errors });
    const at = this.now();
    return { backend: okBackends[0], backends: okBackends, key, bytes: bytes.length, sha256: await sha256Bytes(bytes), createdAt: at, expiresAt: new Date(at.getTime() + 48 * 3600 * 1000) };
  }
  where(rec) {
    const all = rec.backends?.length ? rec.backends : [rec.backend];
    return [rec.backend, ...all.filter((n) => n !== rec.backend)].filter((n) => this.stores[n]?.configured());
  }
  async getSignedUrl(rec, ttlSeconds) {
    const s = await this.getSettings();
    const ttl = ttlSeconds || (Number(s.ttlHours) > 0 ? Number(s.ttlHours) * 3600 : 86400);
    let last;
    for (const n of this.where(rec)) { try { return await this.stores[n].getSignedUrl(rec.key, ttl); } catch (e) { last = e; } }
    throw last || new Error('backend-not-configured');
  }
  /** Make a signed link per backend and actually fetch it (as the print provider will): the first one that works wins. */
  async firstReachable(rec) {
    const s = await this.getSettings();
    const ttl = Number(s.ttlHours) > 0 ? Number(s.ttlHours) * 3600 : 86400;
    let last = { status: 0, contentType: '', bytes: null };
    for (const n of this.where(rec)) {
      try {
        const url = await this.stores[n].getSignedUrl(rec.key, ttl);
        const r = await this.fetchUrl(url);
        if (r.status === 200 && r.bytes) return { url, backend: n, ...r };
        last = r;
      } catch { last = { status: 0, contentType: '', bytes: null }; }
    }
    return { url: null, ...last };
  }
  async get(rec) {
    let last;
    for (const n of this.where(rec)) { try { const r = await this.stores[n].get(rec.key); if (r) return r; } catch (e) { last = e; } }
    if (last) throw last;
    return null;
  }
  async exists(rec) {
    for (const n of this.where(rec)) { try { if (await this.stores[n].exists(rec.key)) return true; } catch { /* try the next one */ } }
    return false;
  }
  /** Deletes the file from EVERY backend that holds a copy. ok only when every deletion succeeded. */
  async delete(rec) {
    const all = rec.backends?.length ? rec.backends : [rec.backend];
    const results = [];
    for (const n of all) {
      if (!this.stores[n]?.configured()) { results.push({ backend: n, ok: false, error: 'not-configured' }); continue; }
      try { await this.stores[n].delete(rec.key); results.push({ backend: n, ok: true }); } catch (e) { results.push({ backend: n, ok: false, error: e.message }); }
    }
    return { ok: results.every((r) => r.ok), results };
  }
  async health() {
    const out = {};
    for (const [n, s] of Object.entries(this.stores)) out[n] = s ? await s.health() : { status: 'not-configured' };
    return out;
  }
  /** Fetch a signed URL exactly as the print provider would (no login): status, content type and bytes. */
  async fetchUrl(url) {
    if (String(url).startsWith('mock://')) { // dev:mock / tests: the "link" points at an in-memory store
      const m = /^mock:\/\/([^/]+)\/([^?]+)\?exp=(\d+)$/.exec(url);
      const hit = m && Number(m[3]) > Date.now() ? await this.stores[m[1]]?.get(m[2]) : null;
      return hit ? { status: 200, contentType: hit.contentType, bytes: hit.bytes } : { status: 404, contentType: '', bytes: null };
    }
    const r = await timed(this.fetch, url, { method: 'GET' }, PUT_TIMEOUT_MS * 3);
    return { status: r.status, contentType: r.headers.get('content-type') || '', bytes: r.ok ? new Uint8Array(await r.arrayBuffer()) : null };
  }
}

export function createFileStore({ env = {}, fetch: f, getSettings, onEvent, now } = {}) {
  return new FailoverStore({
    stores: {
      supabase: new SupabaseStore({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, bucket: env.SUPABASE_BUCKET, fetch: f }),
      r2: new R2Store({ accountId: env.R2_ACCOUNT_ID, accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, bucket: env.R2_BUCKET, fetch: f })
    },
    getSettings, onEvent, now, fetch: f
  });
}
