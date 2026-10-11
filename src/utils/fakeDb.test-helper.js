// An in-memory stand-in for the slice of Dexie the data-layer utils use, so
// the delete / restore / import paths can be tested in node.
//
// Test-only (imported by *.test.js files, never by the app). It follows the
// IndexedDB rules that the real bugs depended on:
// - explicit numeric keys advance the key generator, and `clear()` never
//   rewinds it — which is exactly why re-created cardio rows got new ids;
// - a `transaction()` that throws rolls every table back, as an aborted
//   IndexedDB transaction does;
// - `bulkAdd` adds what it can and then throws a `BulkError` for the rest.

const clone = (o) => (o == null ? o : structuredClone(o));

function compare(a, b) {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a > b ? 1 : -1;
}

class Collection {
  constructor(table, pred, order = null) {
    this.t = table;
    this.pred = pred;
    this._rev = false;
    this._limit = Number.POSITIVE_INFINITY;
    this._order = order;
  }
  _rows() {
    let rows = [...this.t.rows.values()].filter(this.pred);
    if (this._order) {
      const k = this._order;
      rows = rows.filter((r) => r[k] !== undefined).sort((a, b) => compare(a[k], b[k]) || a.id - b.id);
    } else {
      rows.sort((a, b) => a.id - b.id);
    }
    if (this._rev) rows.reverse();
    return rows.slice(0, this._limit);
  }
  reverse() { this._rev = !this._rev; return this; }
  limit(n) { this._limit = n; return this; }
  filter(fn) { const p = this.pred; this.pred = (r) => p(r) && fn(r); return this; }
  and(fn) { return this.filter(fn); }
  async toArray() { return this._rows().map(clone); }
  async first() { const r = this._rows()[0]; return r ? clone(r) : undefined; }
  async last() { const r = this._rows().at(-1); return r ? clone(r) : undefined; }
  async count() { return this._rows().length; }
  async delete() { const rows = this._rows(); for (const r of rows) this.t.rows.delete(r.id); return rows.length; }
  async primaryKeys() { return this._rows().map((r) => r.id); }
  async keys() { return this._rows().map((r) => r[this._order ?? 'id']); }
  async uniqueKeys() { return [...new Set(await this.keys())]; }
  async sortBy(k) { return this._rows().sort((a, b) => compare(a[k], b[k])).map(clone); }
  async modify(changes) {
    const rows = this._rows();
    for (const r of rows) {
      if (typeof changes === 'function') changes(r);
      else Object.assign(r, clone(changes));
    }
    return rows.length;
  }
}

class WhereClause {
  constructor(table, field) { this.t = table; this.f = field; }
  equals(v) { return new Collection(this.t, (r) => r[this.f] === v, this.f); }
  anyOf(list) { const s = new Set(list); return new Collection(this.t, (r) => s.has(r[this.f]), this.f); }
  above(v) { return new Collection(this.t, (r) => r[this.f] > v, this.f); }
  aboveOrEqual(v) { return new Collection(this.t, (r) => r[this.f] >= v, this.f); }
  below(v) { return new Collection(this.t, (r) => r[this.f] < v, this.f); }
  between(a, b) { return new Collection(this.t, (r) => r[this.f] >= a && r[this.f] < b, this.f); }
}

export class Table {
  constructor(name) { this.name = name; this.rows = new Map(); this.seq = 0; }
  _key(o) {
    if (o.id == null) o.id = ++this.seq;
    else if (typeof o.id === 'number' && o.id > this.seq) this.seq = Math.floor(o.id);
    return o.id;
  }
  async toArray() { return [...this.rows.values()].sort((a, b) => a.id - b.id).map(clone); }
  async get(id) { const r = this.rows.get(id); return r ? clone(r) : undefined; }
  async bulkGet(ids) { return ids.map((id) => clone(this.rows.get(id))); }
  async add(obj) {
    const o = clone(obj);
    if (o.id != null && this.rows.has(o.id)) {
      const e = new Error(`Key ${o.id} already exists in ${this.name}`);
      e.name = 'ConstraintError';
      throw e;
    }
    this._key(o);
    this.rows.set(o.id, o);
    return o.id;
  }
  async put(obj) { const o = clone(obj); this._key(o); this.rows.set(o.id, o); return o.id; }
  async bulkAdd(arr) {
    const failures = [];
    for (const o of arr) {
      try { await this.add(o); } catch (e) { failures.push(e); }
    }
    if (failures.length) {
      const e = new Error(`${failures.length} of ${arr.length} operations failed`);
      e.name = 'BulkError';
      e.failures = failures;
      throw e;
    }
  }
  async bulkPut(arr) { for (const o of arr) await this.put(o); }
  async delete(id) { this.rows.delete(id); }
  async bulkDelete(ids) { for (const id of ids) this.rows.delete(id); }
  async update(id, patch) {
    const r = this.rows.get(id);
    if (!r) return 0;
    Object.assign(r, clone(patch));
    return 1;
  }
  async clear() { this.rows.clear(); }
  async count() { return this.rows.size; }
  where(field) { return new WhereClause(this, field); }
  orderBy(field) { return new Collection(this, () => true, field); }
  filter(fn) { return new Collection(this, fn); }
  toCollection() { return new Collection(this, () => true); }
}

export const TABLES = [
  'exercises', 'workouts', 'sets', 'templates', 'templateExercises', 'prs', 'bodyStats', 'sleepLogs',
  'energyLogs', 'userProfile', 'notifications', 'exerciseNotes', 'achievements', 'dailyLogs', 'questClaims', 'photos',
];

export function makeDb() {
  const db = {};
  db.tables = TABLES.map((n) => {
    const t = new Table(n);
    db[n] = t;
    return t;
  });
  let depth = 0;
  // Nested calls join the outer transaction, as Dexie's do. Only the outermost
  // one snapshots, and a throw anywhere inside rolls all of it back.
  db.transaction = async (...args) => {
    const fn = args.at(-1);
    if (depth > 0) return fn();
    const saved = db.tables.map((t) => ({ t, rows: new Map([...t.rows].map(([k, v]) => [k, clone(v)])), seq: t.seq }));
    depth += 1;
    try {
      return await fn();
    } catch (err) {
      // An aborted IndexedDB transaction reverts the key generator as well
      // as the rows (unlike clear(), which never rewinds it).
      for (const { t, rows, seq } of saved) {
        t.rows = rows;
        t.seq = seq;
      }
      throw err;
    } finally {
      depth -= 1;
    }
  };
  return db;
}

/** Swappable singleton the mocked `db` module re-exports. */
export const holder = { db: makeDb() };

/** Fresh tables, same object (modules already hold a reference to it). */
export function resetDb() {
  const fresh = makeDb();
  for (const k of Object.keys(holder.db)) delete holder.db[k];
  Object.assign(holder.db, fresh);
  return holder.db;
}

/** A localStorage for node, which has none. */
export function installLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  return globalThis.localStorage;
}
