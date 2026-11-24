// POST /api/merch/cron - for an external scheduler (e.g. a Cloudflare Worker cron or any cron service):
// retries queued fulfilment jobs, polls providers for tracking, marks commissions eligible, and deletes print files that are due
// for removal (unconfirmed uploads after 48 h, cancelled/refunded after 7 days, delivered after the retention window).
// Header x-cron-secret must equal the MERCH_CRON_SECRET secret.
import { runCron } from '../../../src/merch/cronRun.js';
import { buildCtx } from '../../_lib/merchCtx.js';
import { json } from '../../_lib/server.js';
import { hmacHex, sameString } from '../../_lib/merchCtx.js';

// Constant-time check: both values are hashed (HMAC, fixed key) to the same length first, then compared without early exit,
// so neither the content nor the length of the secret can be learned from timing.
export async function secretMatches(expected, given) {
  if (!expected || !given) return false;
  const key = 'merch-cron-compare';
  return sameString(await hmacHex(key, expected), await hmacHex(key, given));
}

// POST /api/merch/cron            -> does the daily work and returns counts only.
// POST /api/merch/cron?dryRun=1   -> deletes and changes NOTHING; reports how many files would be deleted per rule.
export async function onRequestPost({ request, env }) {
  if (!(await secretMatches(env.MERCH_CRON_SECRET, request.headers.get('x-cron-secret') || ''))) return json({ error: 'forbidden' }, 403);
  const dry = new URL(request.url).searchParams.get('dryRun') === '1';
  try {
    const ctx = await buildCtx(env, null);
    const r = await runCron(ctx, { dryRun: dry });
    return json(r.body, r.status);
  } catch { return json({ error: 'server-error' }, 500); }
}
