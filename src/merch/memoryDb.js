// In-memory implementation of the db interface used by the merchandise engine (tests and fakes).
// Mirrors the Firestore REST adapter: get -> { data, updateTime } | null; create fails if the id exists;
// patch merges and honours an updateTime precondition.
export function createMemoryDb(seed = {}) {
  const store = new Map();
  const times = new Map();
  let tick = 0;
  const put = (path, data) => { store.set(path, data); times.set(path, `t${++tick}`); };
  Object.entries(seed).forEach(([p, d]) => put(p, JSON.parse(JSON.stringify(d))));
  const copy = (d) => (d === undefined ? d : structuredClone(d));
  const children = (coll) => [...store.keys()].filter((k) => k.startsWith(`${coll}/`) && !k.slice(coll.length + 1).includes('/'));
  return {
    store,
    async get(path) { return store.has(path) ? { data: copy(store.get(path)), updateTime: times.get(path) } : null; },
    async list(coll) { return children(coll).map((k) => copy(store.get(k))); },
    async query(coll, field, value) { return children(coll).map((k) => copy(store.get(k))).filter((d) => d[field] === value); },
    async create(coll, id, data) {
      const path = `${coll}/${id}`;
      if (store.has(path)) throw new Error('exists');
      put(path, copy(data));
    },
    async createMany(items) { for (const { path, data } of items) if (!store.has(path)) put(path, copy(data)); },
    async patch(path, data, { ifUpdateTime } = {}) {
      if (ifUpdateTime && times.get(path) !== ifUpdateTime) { const e = new Error('precondition'); e.status = 409; throw e; }
      put(path, { ...(store.get(path) || {}), ...copy(data) });
    }
  };
}
