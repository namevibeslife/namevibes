// What /api/merch/cron does, separated from the HTTP handler so it can be tested. Counts only: no keys, file names or links.
import { retryDue, syncTracking, sweepCommissions, sweepFiles } from './engine.js';

export async function runCron(ctx, { dryRun = false } = {}) {
  if (dryRun) { // changes NOTHING: no retries, no tracking sync, no deletion
    const r = await sweepFiles(ctx, { dryRun: true });
    if (r.error) return { status: 503, body: { dryRun: true, error: r.error } };
    return { status: 200, body: { dryRun: true, wouldDelete: r.due, byRule: r.byRule, skippedOpenCase: r.skippedOpenCase, deleted: 0 } };
  }
  const files = await sweepFiles(ctx).then((r) => ({ due: r.due, deleted: r.deleted, failed: r.failed })).catch(() => ({ error: true }));
  return { status: 200, body: { retried: (await retryDue(ctx)).length, synced: (await syncTracking(ctx)).length, eligible: (await sweepCommissions(ctx)).length, files } };
}
