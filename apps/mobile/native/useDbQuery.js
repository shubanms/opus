// Live-query hook for the SQLite layer — the native equivalent of the web app's
// Dexie useLiveQuery. Runs `query()` once on mount (and whenever `deps` change),
// then re-runs it on every DB write (via subscribeDb). Because expo-sqlite is
// synchronous the query runs inline; the tiny data set keeps this cheap.
import { useCallback, useEffect, useState } from 'react';
import { subscribeDb } from './db';

export function useDbQuery(query, deps = [], initial = null) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(query, deps);
  const [value, setValue] = useState(() => {
    try { return run(); } catch { return initial; }
  });

  useEffect(() => {
    const compute = () => {
      try { setValue(run()); } catch { setValue(initial); }
    };
    compute(); // deps changed → recompute immediately
    const unsub = subscribeDb(compute); // and on every write
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  return value;
}
