import { describe, it, expect, afterEach } from 'vitest';
import {
  describePersistence,
  persistenceState,
  requestPersistence,
  PERSIST_GRANTED,
  PERSIST_BEST_EFFORT,
  PERSIST_UNSUPPORTED,
} from './storage.js';

// The node test env has no `navigator.storage`; each test installs a stub.
const realNavigator = globalThis.navigator;

function stubStorage(storage) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { storage },
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  Object.defineProperty(globalThis, 'navigator', {
    value: realNavigator,
    configurable: true,
    writable: true,
  });
});

describe('describePersistence', () => {
  it('reports granted storage as protected', () => {
    const d = describePersistence(PERSIST_GRANTED);
    expect(d.label).toBe('Protected');
    expect(d.tone).toBe('good');
  });

  it('warns when storage is only best-effort', () => {
    const d = describePersistence(PERSIST_BEST_EFFORT);
    expect(d.label).toBe('At risk');
    expect(d.tone).toBe('warn');
    expect(d.detail).toMatch(/backup/i);
  });

  it('falls back to a neutral description for unsupported/unknown states', () => {
    for (const state of [PERSIST_UNSUPPORTED, undefined, 'nonsense']) {
      const d = describePersistence(state);
      expect(d.label).toBe('Unknown');
      expect(d.tone).toBe('neutral');
    }
  });

  it('always returns a label, detail and tone', () => {
    for (const state of [PERSIST_GRANTED, PERSIST_BEST_EFFORT, PERSIST_UNSUPPORTED]) {
      const d = describePersistence(state);
      expect(typeof d.label).toBe('string');
      expect(typeof d.detail).toBe('string');
      expect(typeof d.tone).toBe('string');
    }
  });
});

describe('persistenceState', () => {
  it('is unsupported when the Storage API is missing', async () => {
    stubStorage(undefined);
    expect(await persistenceState()).toBe(PERSIST_UNSUPPORTED);
  });

  it('reports granted when already persisted', async () => {
    stubStorage({ persisted: async () => true });
    expect(await persistenceState()).toBe(PERSIST_GRANTED);
  });

  it('reports best-effort when not persisted', async () => {
    stubStorage({ persisted: async () => false });
    expect(await persistenceState()).toBe(PERSIST_BEST_EFFORT);
  });

  it('never throws when the API rejects', async () => {
    stubStorage({ persisted: async () => { throw new Error('nope'); } });
    expect(await persistenceState()).toBe(PERSIST_UNSUPPORTED);
  });
});

describe('requestPersistence', () => {
  it('is unsupported when persist() is missing', async () => {
    stubStorage({ persisted: async () => false });
    expect(await requestPersistence()).toBe(PERSIST_UNSUPPORTED);
  });

  it('short-circuits without re-requesting when already granted', async () => {
    let asked = 0;
    stubStorage({
      persisted: async () => true,
      persist: async () => { asked += 1; return true; },
    });
    expect(await requestPersistence()).toBe(PERSIST_GRANTED);
    expect(asked).toBe(0);
  });

  it('requests and reports the grant', async () => {
    stubStorage({ persisted: async () => false, persist: async () => true });
    expect(await requestPersistence()).toBe(PERSIST_GRANTED);
  });

  it('reports best-effort when the request is denied', async () => {
    stubStorage({ persisted: async () => false, persist: async () => false });
    expect(await requestPersistence()).toBe(PERSIST_BEST_EFFORT);
  });

  it('never throws when the request rejects', async () => {
    stubStorage({
      persisted: async () => false,
      persist: async () => { throw new Error('nope'); },
    });
    expect(await requestPersistence()).toBe(PERSIST_UNSUPPORTED);
  });
});
