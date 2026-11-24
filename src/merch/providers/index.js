// Builds the adapter for a merch_providers document. Secrets come from `env` (server secrets) only.
// Live submission needs BOTH QIKINK_ENV=live and the provider's own `liveEnabled` admin switch; both default off.
import { MockProviderAdapter } from './mock.js';
import { QikinkAdapter } from './qikink.js';

// Values pasted into a dashboard may carry spaces, line breaks, quotes or invisible characters: remove them (names and values are never logged).
export const cleanEnvValue = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u0020\u007f-\u00a0\u200b-\u200f\u2028\u2029\ufeff]/g, '').replace(/^["']+|["']+$/g, '') : '');

export function createProvider(doc, env = {}, deps = {}) {
  if (doc.adapter === 'mock') return deps.mock || new MockProviderAdapter(doc.id);
  if (doc.adapter === 'qikink') {
    const live = env.QIKINK_ENV === 'live' && doc.liveEnabled === true;
    return new QikinkAdapter(doc.id, { clientId: cleanEnvValue(env.QIKINK_CLIENT_ID), clientSecret: cleanEnvValue(env.QIKINK_CLIENT_SECRET), env: live ? 'live' : 'sandbox', ...(env.QIKINK_FUNDS_ERROR_PATTERN ? { fundsPattern: new RegExp(env.QIKINK_FUNDS_ERROR_PATTERN, 'i') } : {}), ...deps.qikink });
  }
  return null;
}
