import { useEffect, useState } from 'react';
import useWorkoutStore from '../store/workoutStore.js';
import { useHaptics } from './useHaptics.js';
import { playChime } from '../utils/sound.js';
import { restOutcome, restProgress, restRemaining } from '../utils/restClock.js';

/** How long the "go" moment stays on screen after a rest runs out. */
export const REST_DONE_HOLD_MS = 1600;

/**
 * The live rest, read against the clock.
 *
 * Remaining time is computed from the stored deadline on every tick and the
 * moment the app becomes visible again — never counted down — so a locked
 * phone cannot stretch a rest. `tickMs` is how often the reading refreshes.
 */
export function useRestClock(tickMs = 500) {
  const rest = useWorkoutStore((s) => s.activeWorkout?.rest ?? null);
  const [now, setNow] = useState(() => Date.now());
  const endsAt = rest?.endsAt ?? null;

  useEffect(() => {
    if (endsAt == null) return undefined;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, tickMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [endsAt, tickMs]);

  return {
    rest,
    now,
    remaining: restRemaining(rest, now),
    progress: restProgress(rest, now),
    done: Boolean(rest) && now >= rest.endsAt,
  };
}

// One cue per deadline, however many components are watching it.
let handledEndsAt = null;

/**
 * Ends rests: one chime and one buzz the moment a rest runs out (both gated on
 * the sound / effects settings), a short "go" beat, then the rest is cleared.
 * A rest that ran out while the phone was locked ends quietly — a chime that
 * arrives minutes late means nothing.
 *
 * Mounted once, in the bottom nav, because that is on screen from every tab:
 * the rest is no longer something only the workout page knows about. Returns
 * the same reading as `useRestClock`, so the nav needs no second timer.
 */
export function useRestAlarm() {
  const clock = useRestClock();
  const { rest, now } = clock;
  const clearRest = useWorkoutStore((s) => s.clearRest);
  const haptic = useHaptics();

  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the clock and the rest; `haptic` is a fresh closure each render
  useEffect(() => {
    if (!rest) return;
    const outcome = restOutcome(rest, now, handledEndsAt);
    if (outcome) {
      handledEndsAt = rest.endsAt;
      if (outcome === 'quiet') {
        clearRest(rest.endsAt);
        return;
      }
      haptic('success');
      playChime('rest');
    }
    if (now >= rest.endsAt + REST_DONE_HOLD_MS) clearRest(rest.endsAt);
  }, [rest, now, clearRest]);

  return clock;
}
