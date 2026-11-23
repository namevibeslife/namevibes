// How the browser talks to the merchandise server. In production every call is a POST to
// /api/merch/<action> with the Firebase ID token and the server decides everything. In
// `npm run dev:mock` there is no server, so the SAME engine (src/merch/engine.js) runs in the browser
// against the mock database with a simulated payment gateway and a simulated provider that can be told
// to time out or reject, so the whole customer and admin workflow can be tried offline.
import { auth, db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where } from 'firebase/firestore';

export const IS_MOCK = import.meta.env.MODE === 'mock';

async function callServer(action, body) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`/api/merch/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, body: data };
}

// ---- mock mode ---------------------------------------------------------------------------------------
// The engine and simulated providers are only loaded in mock mode (dynamic import, removed from production builds).
let mockLib = null;
async function loadMock() {
  if (!mockLib) {
    const [engine, prov] = await Promise.all([import('./engine.js'), import('./providers/mock.js')]);
    mockLib = { engine, p1: new prov.MockProviderAdapter('mock'), p2: new prov.MockProviderAdapter('mock2') };
  }
  return mockLib;
}

const mockDb = {
  async get(path) {
    const snap = await getDoc(doc(db, ...path.split('/')));
    return snap.exists() ? { data: snap.data(), updateTime: null } : null;
  },
  async list(coll) { return (await getDocs(collection(db, coll))).docs.map((d) => d.data()); },
  async query(coll, field, value) { return (await getDocs(query(collection(db, coll), where(field, '==', value)))).docs.map((d) => d.data()); },
  async create(coll, id, data) {
    const ref = doc(db, coll, id);
    if ((await getDoc(ref)).exists()) throw new Error('exists');
    await setDoc(ref, data);
  },
  async patch(path, data) {
    const ref = doc(db, ...path.split('/'));
    if ((await getDoc(ref)).exists()) await updateDoc(ref, data); else await setDoc(ref, data);
  }
};

const mockCtx = async () => {
  const { p1, p2 } = await loadMock();
  const user = auth.currentUser;
  return {
    db: mockDb, env: {}, now: () => new Date(),
    who: user ? { uid: user.uid, email: user.email, emailVerified: true } : null,
    id: () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8),
    providerFor: (p) => (p.id === 'mock2' ? p2 : p1),
    artworkUrl: async (order, item) => `mock://${item.artwork.path}`,
    gateways: {
      async create(order, choice) { return { orderId: `mock_${order.id}`, client: { gateway: 'mock', realGateway: choice.gateway, orderId: `mock_${order.id}` } }; },
      async verify() { return { transactionId: `mock_tx_${Date.now()}` }; },
      async checkCaptured() { return {}; },
      async refund() { return { ok: true }; }
    }
  };
};

export async function callMerch(action, body) {
  if (!IS_MOCK) return callServer(action, body);
  const { engine } = await loadMock();
  return engine.handleMerch(await mockCtx(), action, body || {});
}

// Mock-only helpers used by the admin screen to exercise failures and tracking.
export const mockControls = IS_MOCK ? {
  failNext: async (kind) => { const { p1, p2 } = await loadMock(); p1.failNext(kind); p2.failNext(kind); },
  advance: async (orderId, status, tracking) => (await loadMock()).engine.applyProviderStatus(await mockCtx(), orderId, { status, tracking }),
  retryDue: async () => (await loadMock()).engine.retryDue(await mockCtx()),
  sync: async () => (await loadMock()).engine.syncTracking(await mockCtx()),
  sweep: async () => (await loadMock()).engine.sweepCommissions(await mockCtx())
} : null;
