// Customer print files: upload, pre-submission check, and automatic deletion (privacy: they hold customers' names and designs).
// Runs against ctx.files (a FailoverStore, see storage/stores.js) and ctx.db. Only keys under merch/print/ and merch/mockup/
// are ever touched; the Bloodline master artwork and every other shared asset live elsewhere and are never listed or deleted here.
import { COLL } from './constants.js';
import { readPng } from './storage/png.js';
import { sha256Bytes } from './storage/stores.js';

const ok = (body = {}) => ({ status: 200, body });
const fail = (status, code, extra = {}) => ({ status, body: { error: code, ...extra } });
const clone = (o) => JSON.parse(JSON.stringify(o));
const ms = (t) => (t == null ? 0 : (typeof t?.toDate === 'function' ? t.toDate() : new Date(t)).getTime());

export const MAX_PRINT_BYTES = 15 * 1024 * 1024;
export const MAX_MOCKUP_BYTES = 5 * 1024 * 1024;
export const FILE_COLL = 'merch_file_logs';
export const DEFAULT_RETENTION = { unconfirmedHours: 48, closedDays: 7, deliveredDays: 30 };
const UNPAID = ['draft', 'quoted', 'payment_pending'];

/** Store one print file or mock-up for an item of the caller's own order. The server checks everything; the browser is not trusted. */
export async function uploadFile(ctx, { orderId, index, kind, bytes }) {
  if (!ctx.who) return fail(401, 'not-signed-in');
  if (!ctx.files) return fail(503, 'storage-not-configured');
  if (!(bytes instanceof Uint8Array) || !['print', 'mockup'].includes(kind)) return fail(400, 'bad-upload');
  if (bytes.length === 0 || bytes.length > (kind === 'print' ? MAX_PRINT_BYTES : MAX_MOCKUP_BYTES)) return fail(413, 'file-too-large');
  const png = readPng(bytes); // the PNG signature itself, not the Content-Type header
  if (!png) return fail(400, 'not-a-png');
  const found = await ctx.db.get(`${COLL.orders}/${orderId}`);
  const order = found?.data;
  if (!order || order.uid !== ctx.who.uid) return fail(404, 'order-not-found');
  if (!['payment_pending', 'paid', 'fulfillment_pending', 'exception'].includes(order.status)) return fail(409, 'order-locked');
  const idx = Number(index);
  const item = order.items?.[idx];
  if (!Number.isInteger(idx) || !item) return fail(400, 'bad-artwork-index');
  if (kind === 'print') {
    // the pixel size must reach the product's minimum DPI over the print area (a phone may have had to render smaller)
    const dpi = item.canvasInches?.width ? png.width / item.canvasInches.width : null;
    if (dpi !== null && item.minDpi && dpi < item.minDpi * 0.99) return fail(400, 'resolution-too-low', { dpi: Math.round(dpi), minDpi: item.minDpi });
  }
  const key = `merch/${kind}/${ctx.who.uid}/${order.id}/${idx}-${ctx.id()}.png`; // never guessable, never listable
  let rec;
  try { rec = await ctx.files.put(key, bytes, 'image/png'); }
  catch (e) { return fail(503, e?.code === 'storage-not-configured' ? 'storage-not-configured' : 'storage-unavailable'); }
  const fresh = (await ctx.db.get(`${COLL.orders}/${order.id}`))?.data || order;
  const items = clone(fresh.items);
  const previous = kind === 'print' ? items[idx].artwork : items[idx].mockup;
  const stored = { key, path: key, backend: rec.backend, backends: rec.backends, bytes: rec.bytes, sha256: rec.sha256, createdAt: rec.createdAt, expiresAt: rec.expiresAt };
  if (kind === 'print') items[idx].artwork = { kind: 'upload', ...stored, width: png.width, height: png.height, version: item.design?.templateVersion, layout: item.layout };
  else items[idx].mockup = stored;
  await ctx.db.patch(`${COLL.orders}/${order.id}`, { items });
  if (previous?.key && previous.key !== key && !previous.fileDeletedAt) await ctx.files.delete(previous).catch(() => {}); // replaced upload: remove the old copy
  return ok({ ok: true, sha256: rec.sha256, width: png.width, height: png.height, backend: rec.backend });
}

/**
 * Before an order goes to the print provider: fetch the signed link exactly as the provider will (no login) and check
 * status, PNG type, size and the byte-for-byte hash. Returns { ok, url } or { error }.
 */
export async function checkFileReachable(ctx, order, item, kind) {
  const rec = kind === 'mockup' ? item.mockup : item.artwork;
  if (!rec?.key || rec.fileDeletedAt) return { error: 'artwork-missing' };
  let url; let r;
  try {
    if (typeof ctx.files.firstReachable === 'function') { r = await ctx.files.firstReachable(rec); url = r.url; } // tries every backend that holds a copy
    else { url = await ctx.artworkUrl(order, item, kind); r = await ctx.files.fetchUrl(url); }
  } catch { return { error: 'artwork-unreachable' }; }
  if (!url || r.status !== 200 || !r.bytes) return { error: 'artwork-unreachable' };
  if (!/image\/png/i.test(r.contentType)) return { error: 'artwork-bad-type' };
  if (rec.bytes && r.bytes.length !== rec.bytes) return { error: 'artwork-size-mismatch' };
  if (rec.sha256 && (await sha256Bytes(r.bytes)) !== rec.sha256) return { error: 'artwork-hash-mismatch' };
  return { ok: true, url };
}

// ---- automatic deletion -----------------------------------------------------------------------------

export function retentionSettings(doc) {
  const d = doc || {};
  const days = (v, dflt) => (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 365 ? Number(v) : dflt);
  return { deliveredDays: days(d.retentionDays, DEFAULT_RETENTION.deliveredDays), byProduct: d.retentionByProduct || {}, unconfirmedHours: DEFAULT_RETENTION.unconfirmedHours, closedDays: DEFAULT_RETENTION.closedDays };
}
const stateTime = (order, states) => { const t = [...(order.timeline || [])].reverse().find((e) => states.includes(e.state)); return t ? ms(t.at) : null; };

/** When may this item's files be removed? Returns { at, reason } (ms since epoch) or null when they must be kept. */
export function dueFor(order, item, settings) {
  if (order.openCase === true || ['exception', 'held_provider_funds'].includes(order.status)) return null; // open return / dispute / exception: keep
  const closed = order.caseClosedAt ? ms(order.caseClosedAt) : 0;
  const DAY = 24 * 3600 * 1000;
  if (UNPAID.includes(order.status)) return { at: ms(order.createdAt) + settings.unconfirmedHours * 3600 * 1000, reason: 'unconfirmed' };
  if (['cancelled', 'refunded'].includes(order.status)) {
    const base = stateTime(order, ['cancelled', 'refunded']);
    return base == null ? null : { at: Math.max(base, closed) + settings.closedDays * DAY, reason: order.status };
  }
  if (order.status === 'delivered') {
    const base = stateTime(order, ['delivered']);
    const days = Number.isFinite(Number(settings.byProduct?.[item.productId])) ? Number(settings.byProduct[item.productId]) : settings.deliveredDays;
    return base == null ? null : { at: Math.max(base, closed) + days * DAY, reason: 'delivered' };
  }
  return null;
}

/** Delete every file that is due. Idempotent; one failure never blocks the others; dryRun lists without deleting. */
export async function sweepFiles(ctx, { dryRun = false } = {}) {
  // byRule = how many files are due per rule; skippedOpenCase = files that WOULD be due but are kept because the order has an open case
  const out = { dryRun, due: 0, deleted: 0, failed: 0, items: [], byRule: { unpaid48h: 0, cancelledOrRefunded7d: 0, delivered30d: 0 }, skippedOpenCase: 0 };
  const ruleName = (r) => (r === 'unconfirmed' ? 'unpaid48h' : r === 'delivered' ? 'delivered30d' : 'cancelledOrRefunded7d');
  if (!ctx.files) return { ...out, error: 'storage-not-configured' };
  const settings = retentionSettings((await ctx.db.get(`${COLL.settings}/storage`))?.data);
  const now = ms(ctx.now());
  for (const order of await ctx.db.list(COLL.orders)) {
    try {
      const todo = [];
      const openCase = order.openCase === true || ['exception', 'held_provider_funds'].includes(order.status);
      if (openCase && ['delivered', 'cancelled', 'refunded', 'exception', 'held_provider_funds'].includes(order.status)) {
        for (const item of order.items || []) for (const kind of ['artwork', 'mockup']) if (item[kind]?.key && !item[kind].fileDeletedAt) out.skippedOpenCase++;
      }
      (order.items || []).forEach((item, idx) => {
        for (const kind of ['artwork', 'mockup']) {
          const rec = item[kind];
          if (!rec?.key || rec.fileDeletedAt) continue;
          const due = dueFor(order, item, settings);
          if (due && due.at <= now) todo.push({ idx, kind, rec, reason: due.reason });
        }
      });
      if (todo.length === 0) continue;
      out.due += todo.length;
      for (const t of todo) out.byRule[ruleName(t.reason)]++;
      if (dryRun) { out.items.push(...todo.map((t) => ({ orderId: order.id, index: t.idx, kind: t.kind, reason: t.reason }))); continue; }
      const gone = [];
      for (const t of todo) {
        let res;
        try { res = await ctx.files.delete(t.rec); } catch (e) { res = { ok: false, results: [{ ok: false, error: e.message }] }; }
        const logId = ctx.id();
        await ctx.db.create(FILE_COLL, logId, { id: logId, orderId: order.id, index: t.idx, kind: t.kind, rule: ruleName(t.reason), ok: res.ok, results: (res.results || []).map((r) => ({ backend: r.backend, ok: r.ok, error: r.error ? String(r.error).slice(0, 40) : undefined })), at: ctx.now() }).catch(() => {});
        if (res.ok) { out.deleted++; gone.push(t); } else out.failed++;
      }
      if (gone.length) { // the order keeps its record, the hash and a timestamp; the page shows "print file removed"
        const fresh = (await ctx.db.get(`${COLL.orders}/${order.id}`))?.data || order;
        const items = clone(fresh.items);
        for (const t of gone) items[t.idx][t.kind] = { ...items[t.idx][t.kind], fileDeletedAt: ctx.now() };
        const all = items.every((i) => (!i.artwork || i.artwork.fileDeletedAt) && (!i.mockup || i.mockup.fileDeletedAt));
        await ctx.db.patch(`${COLL.orders}/${order.id}`, { items, ...(all ? { fileDeletedAt: ctx.now() } : {}) });
      }
    } catch { out.failed++; }
  }
  return out;
}

// ---- safe diagnostics: which settings the running server can see (NAMES only, never values, never lengths) ----------------------
export const STORAGE_ENV_NAMES = ['SUPABASE_URL', 'SUPABASE_BUCKET', 'SUPABASE_SERVICE_ROLE_KEY', 'R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'MERCH_CRON_SECRET'];
export function storageDiagnostics(env = {}) {
  const has = (n) => typeof env[n] === 'string' && env[n].trim().length > 0;
  const vars = Object.fromEntries(STORAGE_ENV_NAMES.map((n) => [n, has(n) ? 'present' : 'missing']));
  const notes = [];
  if (has('SUPABASE_URL') && !/^https:\/\/[^/\s]+/.test(env.SUPABASE_URL.trim())) notes.push('SUPABASE_URL is present but does not start with https://');
  for (const n of STORAGE_ENV_NAMES) if (has(n) && env[n] !== env[n].trim()) notes.push(`${n} has a space or line break at the start or end: save it again without it`);
  if (has('SUPABASE_SERVICE_ROLE_KEY')) { // the kind of key only, never the key
    const k = env.SUPABASE_SERVICE_ROLE_KEY.trim();
    const kind = k.startsWith('sb_secret_') ? 'new-style secret key (correct)' : k.startsWith('sb_publishable_') ? 'PUBLISHABLE key (wrong: use the secret key)' : k.startsWith('eyJ') ? 'legacy JWT key' : 'unrecognised format';
    notes.push(`SUPABASE_SERVICE_ROLE_KEY looks like a ${kind}`);
  }
  // names that look related but are not one of the exact names above (typos like SUPABASE_KEY): names only
  const seenNames = Object.keys(env).filter((k) => /supabase|r2_|service_role|storage|cron/i.test(k) && !STORAGE_ENV_NAMES.includes(k)).slice(0, 20);
  return { vars, notes, seenNames };
}

/** Counts for the admin report: files due now (dry run), deleted and failed deletions from the log. */
export async function fileReport(ctx) {
  const dry = await sweepFiles(ctx, { dryRun: true });
  const logs = await ctx.db.list(FILE_COLL);
  return { due: dry.due, dueItems: dry.items.slice(0, 50), deleted: logs.filter((l) => l.ok).length, failed: logs.filter((l) => !l.ok).length, recentFailures: logs.filter((l) => !l.ok).slice(-10) };
}
