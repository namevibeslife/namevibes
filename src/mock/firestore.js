// Mock of 'firebase/firestore' used when running `npm run dev:mock`.
// Implements only the API surface the app uses, backed by localStorage so data survives reloads.
import { SEED_DATA } from './seed';

const STORAGE_KEY = 'nv_mock_db';

export class Timestamp {
  constructor(seconds, nanoseconds = 0) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  static now() {
    return Timestamp.fromMillis(Date.now());
  }
  static fromDate(date) {
    return Timestamp.fromMillis(date.getTime());
  }
  static fromMillis(ms) {
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }
  toMillis() {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }
  toDate() {
    return new Date(this.toMillis());
  }
  isEqual(other) {
    return other instanceof Timestamp && other.toMillis() === this.toMillis();
  }
  valueOf() {
    return this.toMillis();
  }
}

// --- Serialization: Timestamps/Dates <-> JSON ---------------------------------

function encode(value) {
  if (value instanceof Timestamp) return { __ts: value.toMillis() };
  if (value instanceof Date) return { __ts: value.getTime() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]));
  }
  return value;
}

function decode(value) {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') {
    if (typeof value.__ts === 'number') return Timestamp.fromMillis(value.__ts);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decode(v)]));
  }
  return value;
}

// --- Store ----------------------------------------------------------------------

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seed
  }
  return encode(SEED_DATA);
}

let store = loadStore();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full or blocked; keep working in memory
  }
}

export function resetMockDatabase() {
  store = encode(SEED_DATA);
  persist();
}

const delay = () => new Promise(resolve => setTimeout(resolve, 30));
const randomId = () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);

// --- References -----------------------------------------------------------------

export function getFirestore() {
  return { type: 'firestore' };
}

function joinPath(base, segments) {
  return [base, ...segments].filter(Boolean).join('/');
}

export function collection(parent, ...segments) {
  const base = parent?.type === 'doc' || parent?.type === 'collection' ? parent.path : '';
  const path = joinPath(base, segments);
  return { type: 'collection', path, id: path.split('/').pop() };
}

export function doc(parent, ...segments) {
  const base = parent?.type === 'doc' || parent?.type === 'collection' ? parent.path : '';
  let path = joinPath(base, segments);
  // doc(collectionRef) with no id generates one, like the real SDK
  if (path.split('/').length % 2 === 1) path = `${path}/${randomId()}`;
  return { type: 'doc', path, id: path.split('/').pop() };
}

export function where(field, op, value) {
  return { kind: 'where', field, op, value };
}

export function orderBy(field, direction = 'asc') {
  return { kind: 'orderBy', field, direction };
}

export function limit(n) {
  return { kind: 'limit', n };
}

export function query(ref, ...constraints) {
  return { type: 'query', path: ref.path, constraints: [...(ref.constraints || []), ...constraints] };
}

export function serverTimestamp() {
  return Timestamp.now();
}

// --- Snapshots ------------------------------------------------------------------

function makeDocSnapshot(path) {
  const raw = store[path];
  const id = path.split('/').pop();
  return {
    id,
    ref: { type: 'doc', path, id },
    exists: () => raw !== undefined,
    data: () => (raw === undefined ? undefined : decode(structuredClone(raw)))
  };
}

function getField(data, field) {
  return field.split('.').reduce((obj, key) => (obj == null ? undefined : obj[key]), data);
}

function comparable(value) {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return value;
}

function matches(data, { field, op, value }) {
  const actual = comparable(getField(data, field));
  const expected = Array.isArray(value) ? value.map(comparable) : comparable(value);
  switch (op) {
    case '==': return actual === expected;
    case '!=': return actual !== undefined && actual !== expected;
    case '<': return actual < expected;
    case '<=': return actual <= expected;
    case '>': return actual > expected;
    case '>=': return actual >= expected;
    case 'in': return expected.includes(actual);
    case 'not-in': return actual !== undefined && !expected.includes(actual);
    case 'array-contains': return Array.isArray(actual) && actual.map(comparable).includes(expected);
    case 'array-contains-any': return Array.isArray(actual) && actual.map(comparable).some(v => expected.includes(v));
    default: throw new Error(`[mock firestore] unsupported operator ${op}`);
  }
}

export async function getDoc(ref) {
  await delay();
  return makeDocSnapshot(ref.path);
}

export async function getDocs(ref) {
  await delay();
  const depth = ref.path.split('/').length + 1;
  const prefix = `${ref.path}/`;
  let docs = Object.keys(store)
    .filter(path => path.startsWith(prefix) && path.split('/').length === depth)
    .map(makeDocSnapshot);

  for (const c of ref.constraints || []) {
    if (c.kind === 'where') docs = docs.filter(d => matches(d.data(), c));
  }
  for (const c of [...(ref.constraints || [])].reverse()) {
    if (c.kind !== 'orderBy') continue;
    const dir = c.direction === 'desc' ? -1 : 1;
    // Real Firestore excludes docs missing the orderBy field
    docs = docs
      .filter(d => getField(d.data(), c.field) !== undefined)
      .sort((a, b) => {
        const x = comparable(getField(a.data(), c.field));
        const y = comparable(getField(b.data(), c.field));
        return x < y ? -dir : x > y ? dir : 0;
      });
  }
  const limitConstraint = (ref.constraints || []).find(c => c.kind === 'limit');
  if (limitConstraint) docs = docs.slice(0, limitConstraint.n);

  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
    forEach: (cb) => docs.forEach(cb)
  };
}

export async function addDoc(collectionRef, data) {
  await delay();
  const ref = doc(collectionRef);
  store[ref.path] = encode(data);
  persist();
  return ref;
}

export async function setDoc(ref, data, options = {}) {
  await delay();
  store[ref.path] = options.merge && store[ref.path]
    ? { ...store[ref.path], ...encode(data) }
    : encode(data);
  persist();
}

export async function updateDoc(ref, data) {
  await delay();
  if (store[ref.path] === undefined) {
    const error = new Error(`No document to update: ${ref.path}`);
    error.code = 'not-found';
    throw error;
  }
  store[ref.path] = { ...store[ref.path], ...encode(data) };
  persist();
}

export async function deleteDoc(ref) {
  await delay();
  delete store[ref.path];
  persist();
}
