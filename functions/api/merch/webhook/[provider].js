// POST /api/merch/webhook/{providerId} - authenticated provider status/tracking webhook. Each adapter
// verifies its own signature (verifyWebhook); an adapter without webhooks answers 501.
import { handleProviderWebhook } from '../../../../src/merch/engine.js';
import { buildCtx, respond } from '../../../_lib/merchCtx.js';
import { json } from '../../../_lib/server.js';

export async function onRequestPost({ request, env, params }) {
  const raw = await request.text();
  try {
    const ctx = await buildCtx(env, null);
    return respond(await handleProviderWebhook(ctx, params.provider, request.headers, raw));
  } catch { return json({ error: 'server-error' }, 500); }
}
