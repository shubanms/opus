import { useEffect, useState } from 'react';

/**
 * Seconds since `startedAt`, ticking once a second.
 *
 * Returns 0 when there is nothing running, so callers can use the value as
 * both the reading and the "is a session open?" test.
 */
export function useElapsed(startedAt) {
  const [secs, setSecs] = useState(() =>
    startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0
  );

  useEffect(() => {
    if (!startedAt) {
      setSecs(0);
      return undefined;
    }
    const tick = () => setSecs(Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return secs;
}
