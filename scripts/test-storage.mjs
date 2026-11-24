// Print-file storage layer: SigV4 against AWS's documented example, Supabase and R2 stores against fake servers,
// failover, mirror, timeouts, signed-link expiry, PNG checks. No network and no real account.
import assert from 'node:assert/strict';
import { presignUrl } from '../src/merch/storage/sigv4.js';
import { SupabaseStore, R2Store, MockStore, FailoverStore, createFileStore, validKey } from '../src/merch/storage/stores.js';
import { readPng } from '../src/merch/storage/png.js';
import { makeFakeCloud, fakePng } from './fake-storage.mjs';

let passed = 0, failed = 0;
const test = async (name, fn) => { try { await fn(); passed++; console.log('  ok  ', name); } catch (e) { failed++; console.log('  FAIL', name, '\n      ', e.message); } };
const KEY = 'merch/print/u1/ord1/0-abc123.png';
const KEY2 = 'merch/mockup/u1/ord1/0-abc123.png';
const fresh = (settings = {}) => {
  const cloud = makeFakeCloud(); const events = []; let cfg = { ...settings };
  const store = createFileStore({ env: cloud.env, fetch: cloud.fetch, getSettings: async () => cfg, onEvent: async (e) => events.push(e), now: () => new Date(cloud.clock.t) });
  return { cloud, store, events, set: (s) => { cfg = { ...cfg, ...s }; } };
};
const png = fakePng();

console.log('Print-file storage');
await test('SigV4 presign matches the worked example in the AWS documentation', async () => {
  const u = await presignUrl({ method: 'GET', host: 'examplebucket.s3.amazonaws.com', path: '/test.txt', accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', region: 'us-east-1', expires: 86400, now: Date.UTC(2013, 4, 24) });
  assert.ok(u.endsWith('X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404'));
});
await test('PNG check reads the signature and size, not the content type; junk is refused', () => {
  assert.deepEqual(readPng(png), { width: 2400, height: 3200 });
  assert.equal(readPng(new Uint8Array(100)), null);
  assert.equal(readPng(new TextEncoder().encode('<html>not an image, but sent as image/png</html>'.repeat(3))), null);
  const bad = fakePng(); bad[12] = 0x58; assert.equal(readPng(bad), null);
});
await test('keys: only merch/print and merch/mockup, no traversal, never anything else', () => {
  assert.equal(validKey(KEY), true); assert.equal(validKey(KEY2), true);
  for (const k of ['blood/O+.png', 'merch/print/../x/y/z.png', 'merch/other/u/o/f.png', 'merch/print/u1/o1/', 'public/logo.png', 'merch/print/u 1/o/f.png']) assert.equal(validKey(k), false, k);
});
await test('Supabase store (fake server): put, get, exists, signed link, delete, health; wrong key refused', async () => {
  const { cloud } = fresh(); const s = new SupabaseStore({ url: cloud.env.SUPABASE_URL, serviceKey: cloud.env.SUPABASE_SERVICE_ROLE_KEY, bucket: 'prints', fetch: cloud.fetch });
  await s.put(KEY, png); assert.equal(await s.exists(KEY), true);
  assert.deepEqual([...(await s.get(KEY)).bytes], [...png]);
  const url = await s.getSignedUrl(KEY, 3600); const r = await cloud.fetch(url); assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'image/png');
  assert.equal((await s.health()).status, 'ok');
  await s.delete(KEY); assert.equal(await s.exists(KEY), false); await s.delete(KEY); // deleting twice is fine
  await assert.rejects(() => s.put('merch/print/../../etc/passwd.png', png), /bad-key/);
  assert.equal(cloud.state.sentBearer, false, 'a new-style sb_secret_ key is sent in the apikey header only, never as a Bearer token');
  assert.equal((await s.health()).detail, 'bucket found (private)');
  assert.equal((await cloud.fetch(s.publicUrl(KEY))).status === 200, false, 'the unsigned address is refused');
  assert.equal((await new SupabaseStore({ url: cloud.env.SUPABASE_URL, serviceKey: 'wrong', bucket: 'prints', fetch: cloud.fetch }).health()).status, 'failing');
});
await test('R2 store (fake S3 server): put, get, exists, presigned link, delete, health', async () => {
  const { cloud } = fresh(); const s = new R2Store({ accountId: 'acct', accessKeyId: 'R2AK', secretAccessKey: 'r2-secret-value', bucket: 'prints-r2', fetch: cloud.fetch, now: () => cloud.clock.t });
  await s.put(KEY, png); assert.equal(await s.exists(KEY), true);
  assert.deepEqual([...(await s.get(KEY)).bytes], [...png]);
  const url = await s.getSignedUrl(KEY, 3600); assert.equal((await cloud.fetch(url)).status, 200);
  assert.equal((await s.health()).status, 'ok');
  await s.delete(KEY); assert.equal(await s.exists(KEY), false);
});
await test('signed links expire: a link is refused once its time is up (both backends)', async () => {
  const { cloud, store } = fresh({ mirror: true });
  const rec = await store.put(KEY, png); assert.deepEqual(rec.backends.sort(), ['r2', 'supabase']);
  for (const name of ['r2', 'supabase']) {
    const url = await store.stores[name].getSignedUrl(KEY, 600);
    assert.equal((await cloud.fetch(url)).status, 200);
    cloud.clock.t += 601 * 1000; assert.notEqual((await cloud.fetch(url)).status, 200, name + ' expired'); cloud.clock.t -= 601 * 1000;
  }
});
await test('failover: primary down -> secondary used and the event is recorded; no secret appears in it', async () => {
  const { cloud, store, events, set } = fresh({ primary: 'r2' });
  cloud.state.r2Down = true;
  const rec = await store.put(KEY, png);
  assert.equal(rec.backend, 'supabase'); assert.deepEqual(rec.backends, ['supabase']);
  assert.equal(events.length, 1); assert.equal(events[0].from, 'r2'); assert.equal(events[0].to, 'supabase');
  for (const s of cloud.secrets) assert.ok(!JSON.stringify(events).includes(s));
  assert.ok(!cloud.state.r2.has(KEY));
  set({ primary: 'supabase' }); cloud.state.r2Down = false;
  assert.equal((await store.put(KEY2, png)).backend, 'supabase'); // the owner can swap the order
});
await test('failover: a hanging primary is abandoned after the timeout (8 s by default, short here)', async () => {
  const cloud = makeFakeCloud(); cloud.state.r2Hang = true;
  const store = new FailoverStore({ stores: {
    r2: new R2Store({ accountId: 'acct', accessKeyId: 'R2AK', secretAccessKey: 'x', bucket: 'prints-r2', fetch: cloud.fetch, timeoutMs: 60 }),
    supabase: new SupabaseStore({ url: cloud.env.SUPABASE_URL, serviceKey: cloud.env.SUPABASE_SERVICE_ROLE_KEY, bucket: 'prints', fetch: cloud.fetch, timeoutMs: 60 }) }, getSettings: async () => ({ primary: 'r2' }) });
  const t0 = Date.now(); const rec = await store.put(KEY, png);
  assert.equal(rec.backend, 'supabase'); assert.ok(Date.now() - t0 < 2000);
});
await test('both backends down -> storage-unavailable (the order is not submitted); nothing configured -> storage-not-configured, never a crash', async () => {
  const { cloud, store } = fresh(); cloud.state.r2Down = true; cloud.state.sbDown = true;
  await assert.rejects(() => store.put(KEY, png), (e) => e.code === 'storage-unavailable');
  const none = createFileStore({ env: {}, fetch: cloud.fetch });
  await assert.rejects(() => none.put(KEY, png), (e) => e.code === 'storage-not-configured');
  assert.deepEqual(await none.health(), { supabase: { status: 'not-configured' }, r2: { status: 'not-configured' } });
});
await test('default order: R2 first when configured, otherwise Supabase; only Supabase configured works alone', async () => {
  const { store } = fresh(); assert.equal((await store.put(KEY, png)).backend, 'r2');
  const cloud = makeFakeCloud(); const only = createFileStore({ env: { SUPABASE_URL: cloud.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: cloud.env.SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET: 'prints' }, fetch: cloud.fetch });
  assert.equal((await only.put(KEY, png)).backend, 'supabase'); assert.equal((await only.health()).r2.status, 'not-configured');
});
await test('mirror on: both copies are written and the signed link falls back to the other backend; delete removes both', async () => {
  const { cloud, store } = fresh({ mirror: true });
  const rec = await store.put(KEY, png);
  assert.deepEqual(rec.backends.sort(), ['r2', 'supabase']); assert.ok(cloud.state.r2.has(KEY) && cloud.state.sb.has(KEY));
  cloud.state.r2Down = true; // the recorded first backend is down: the link that actually works comes from the mirror
  const got = await store.firstReachable({ ...rec, backend: 'r2' }); assert.equal(got.status, 200); assert.equal(got.backend, 'supabase'); assert.match(got.url, /sb\.test/);
  cloud.state.r2Down = false;
  const del = await store.delete(rec); assert.equal(del.ok, true); assert.ok(!cloud.state.r2.has(KEY) && !cloud.state.sb.has(KEY));
});
await test('mirror off (default): only one copy; a record is {backend, key, bytes, sha256, createdAt, expiresAt}', async () => {
  const { cloud, store } = fresh();
  const rec = await store.put(KEY, png);
  assert.equal(cloud.state.sb.size + cloud.state.r2.size, 1);
  assert.deepEqual(Object.keys(rec).sort(), ['backend', 'backends', 'bytes', 'createdAt', 'expiresAt', 'key', 'sha256']);
  assert.equal(rec.bytes, png.length); assert.match(rec.sha256, /^[a-f0-9]{64}$/);
});
await test('delete reports a failing backend (mirrored copy left behind) instead of pretending it worked', async () => {
  const { cloud, store } = fresh({ mirror: true }); const rec = await store.put(KEY, png);
  cloud.state.sbDown = true; const del = await store.delete(rec);
  assert.equal(del.ok, false); assert.equal(del.results.find((r) => r.backend === 'r2').ok, true); assert.equal(del.results.find((r) => r.backend === 'supabase').ok, false);
});
await test('MockStore (dev:mock) behaves like a store', async () => {
  const m = new MockStore('x'); await m.put(KEY, png); assert.equal(await m.exists(KEY), true); await m.delete(KEY); assert.equal(await m.exists(KEY), false);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
