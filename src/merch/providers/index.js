// Builds the adapter for a merch_providers document. Secrets come from `env` (server secrets) only.
// Live submission needs BOTH QIKINK_ENV=live and the provider's own `liveEnabled` admin switch; both default off.
import { MockProviderAdapter } from './mock.js';
import { QikinkAdapter } from './qikink.js';

export function createProvider(doc, env = {}, deps = {}) {
  if (doc.adapter === 'mock') return deps.mock || new MockProviderAdapter(doc.id);
  if (doc.adapter === 'qikink') {
    const live = env.QIKINK_ENV === 'live' && doc.liveEnabled === true;
    return new QikinkAdapter(doc.id, { clientId: env.QIKINK_CLIENT_ID, clientSecret: env.QIKINK_CLIENT_SECRET, env: live ? 'live' : 'sandbox', ...deps.qikink });
  }
  return null;
}
