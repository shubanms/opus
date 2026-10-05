// Never throw away a session someone is in the middle of. Not pure — this
// reaches the stores.
//
// Three buttons could silently replace a live workout: History's "Repeat this
// workout", Home's "Enter dungeon", and anything else that called a `start*`
// action. Each overwrote `activeWorkout` — and its localStorage copy — so the
// sets you had logged were gone with no confirm and no undo. The workout
// screen and the app shortcuts already refused to do this; the rule now lives
// here so every entry point asks the same question.

import useWorkoutStore from '../store/workoutStore.js';
import useUIStore from '../store/uiStore.js';

/** Is there a session with at least one logged set? */
export function hasLoggedSets(workout = useWorkoutStore.getState().activeWorkout) {
  return Boolean(workout?.exercises?.some((e) => (e.sets?.length ?? 0) > 0));
}

/**
 * Ask before replacing a session. Resolves true when it is safe to go ahead:
 * no session, an empty one (nothing to lose), or the person said yes.
 */
export async function confirmReplaceSession(what = 'a new session') {
  const active = useWorkoutStore.getState().activeWorkout;
  if (!hasLoggedSets(active)) return true;
  const sets = active.exercises.reduce((n, e) => n + (e.sets?.length ?? 0), 0);
  return useUIStore.getState().confirm({
    title: 'Replace your workout?',
    message: `“${active.name || 'Workout'}” is still open with ${sets} set${sets === 1 ? '' : 's'} logged. Starting ${what} throws it away.`,
    confirmLabel: 'Replace it',
    cancelLabel: 'Keep it',
    danger: true,
  });
}
