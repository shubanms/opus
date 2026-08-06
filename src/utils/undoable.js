// Delete now, offer it back. Not pure — this reaches the UI store.
//
// A confirm dialog taxes the 99% of deletes that were meant, to protect the 1%
// that were not. It is also a poor protection: the second tap is muscle memory
// by the third time you see the dialog, so the mis-tap you were guarding
// against sails straight through it. Undo inverts the deal — the correct action
// costs one tap, and the mistake is recoverable for as long as the toast is up.
//
// Every delete here already reverted its derived data (records, XP,
// achievements, quests, workout totals). The restores run exactly the same
// recomputation, which is why this can be a snapshot-and-put rather than a
// soft-delete flag threaded through every query in the app.

import useUIStore from '../store/uiStore.js';
import { playChime } from './sound.js';

/**
 * @param label   What was deleted, as a person would say it ("Workout").
 * @param remove  Async, returns a snapshot (or null if nothing was deleted).
 * @param restore Async, takes that snapshot and puts it back.
 * @param onUndo  Optional side effect after a successful restore — a page that
 *                navigated away on delete needs to come back.
 */
export async function deleteWithUndo({ label, remove, restore, onUndo }) {
  const snapshot = await remove();
  // Nothing was deleted — a missing row, or a built-in exercise that cannot be.
  // Saying "deleted" here would be a lie with an Undo button on it.
  if (!snapshot) return null;

  playChime('delete');
  useUIStore.getState().showToast(`${label} deleted`, {
    action: {
      label: 'Undo',
      onAction: async () => {
        await restore(snapshot);
        playChime('goal');
        useUIStore.getState().showToast(`${label} restored`, { type: 'success' });
        onUndo?.();
      },
    },
  });
  return snapshot;
}
