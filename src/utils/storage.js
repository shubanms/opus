// Storage persistence.
//
// IndexedDB is "best-effort" by default: under storage pressure a browser may
// evict the whole origin. OPUS has no backend, so eviction means total,
// unrecoverable loss of the user's training history. `navigator.storage.persist()`
// opts the origin out of automatic eviction.
//
// Browsers grant it far more readily to installed PWAs and to origins with real
// engagement, so we ask twice: quietly at startup, and again when onboarding
// completes (by then the user has interacted and may have installed the app).
// The request never prompts on Chrome/Android — it is granted or denied silently.

/** Persistence states, in the order they're reported by `persistenceState()`. */
export const PERSIST_UNSUPPORTED = 'unsupported';
export const PERSIST_GRANTED = 'persisted';
export const PERSIST_BEST_EFFORT = 'best-effort';

// Pure: maps a state to the copy shown in Settings. Kept separate from the
// browser calls so it can be unit-tested.
export function describePersistence(state) {
  switch (state) {
    case PERSIST_GRANTED:
      return {
        label: 'Protected',
        detail: 'Your data is exempt from automatic browser cleanup.',
        tone: 'good',
      };
    case PERSIST_BEST_EFFORT:
      return {
        label: 'At risk',
        detail:
          'The browser may clear your data if storage runs low. Install OPUS to your home screen and keep a recent backup.',
        tone: 'warn',
      };
    default:
      return {
        label: 'Unknown',
        detail: 'This browser cannot report storage protection. Keep a recent backup.',
        tone: 'neutral',
      };
  }
}

/** Current persistence state, without requesting anything. */
export async function persistenceState() {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
    return PERSIST_UNSUPPORTED;
  }
  try {
    return (await navigator.storage.persisted()) ? PERSIST_GRANTED : PERSIST_BEST_EFFORT;
  } catch {
    return PERSIST_UNSUPPORTED;
  }
}

/**
 * Ask the browser to make this origin's storage persistent. Safe to call
 * repeatedly — returns early if it's already granted. Never throws.
 */
export async function requestPersistence() {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return PERSIST_UNSUPPORTED;
  }
  try {
    if (await navigator.storage.persisted()) return PERSIST_GRANTED;
    return (await navigator.storage.persist()) ? PERSIST_GRANTED : PERSIST_BEST_EFFORT;
  } catch {
    return PERSIST_UNSUPPORTED;
  }
}
