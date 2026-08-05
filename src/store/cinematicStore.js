import { create } from 'zustand';
import { queueForResult } from '../utils/cinematics.js';

/**
 * The celebration queue.
 *
 * A finished session can be worth celebrating in several ways at once. They
 * play one after another rather than on top of each other, which is what
 * happened when each was its own piece of local page state.
 *
 * Living in a store rather than in `WorkoutPage` also means the celebration
 * survives the navigation away from the finished session — the old level-up
 * screen was mounted by the page that was about to unmount.
 */
const useCinematicStore = create((set) => ({
  queue: [],

  /** Queue whatever a `completeWorkout` result is worth celebrating. */
  celebrate(result) {
    const items = queueForResult(result);
    if (items.length) set((s) => ({ queue: [...s.queue, ...items] }));
    return items.length;
  },

  /** Finish the current item and move to the next. */
  advance() {
    set((s) => ({ queue: s.queue.slice(1) }));
  },
}));

export default useCinematicStore;
