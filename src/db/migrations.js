/**
 * Schema migration log.
 * v1 — initial schema (see db.js)
 *
 * To add a new version in a future sprint:
 *   import { db } from './db.js';
 *   db.version(N).stores({ ... }).upgrade(tx => { ... });
 * Never mutate an already-shipped version number.
 */
