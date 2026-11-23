// POST /api/merch/cron - for an external scheduler (e.g. a Cloudflare Worker cron or any cron service):
// retries queued fulfilment jobs, polls providers for tracking, marks commissions eligible.
// Header x-cron-secret must equal the MERCH_CRON_SECRET secret.
import { retryDue, syncTracking, sweepCommissions } from '../../../src/merch/engine.js';
import { buildCtx } from '../../_lib/merchCtx.js';
import { json, } from '../../_lib/server.js';
import { sameString } from '../../_lib/merchCtx.js';

export async function onRequestPost({ request, env }) {
  const given = request.headers.get('x-cron-secret') || '';
  if (!env.MERCH_CRON_SECRET || !sameString(env.MERCH_CRON_SECRET, given)) return json({ error: 'forbidden' }, 403);
  try {
    const ctx = await buildCtx(env, null);
    return json({ retried: (await retryDue(ctx)).length, synced: (await syncTracking(ctx)).length, eligible: (await sweepCommissions(ctx)).length });
  } catch { return json({ error: 'server-error' }, 500); }
}
