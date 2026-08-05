import { create } from 'zustand';
import { db } from '../db/db.js';
import { getLevelFromTotalXP, getTitle } from '../utils/rpg.js';

// Shared in-flight init, so concurrent mounts can't each create a profile.
let initPromise = null;

const DEFAULT_PROFILE = {
  name: '',
  height: null,
  sex: null,
  birthYear: null,
  level: 1,
  xp: 0,
  totalXp: 0,
  title: 'First Rep',
  streak: 0,
  lastWorkoutDate: null,
  joinDate: new Date().toISOString().slice(0, 10),
};

const useUserStore = create((set, get) => ({
  profile: null,
  loaded: false,

  // Idempotent under concurrency. The `loaded` flag alone is not enough of a
  // guard: it is only set after two awaits, so two components mounting in the
  // same tick both saw no profile and both inserted one, leaving two
  // userProfile rows and a store holding the wrong one. Sharing the in-flight
  // promise means every caller awaits the same insert.
  init() {
    if (get().loaded) return Promise.resolve();
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        let profile = await db.userProfile.get(1);
        if (!profile) {
          await db.userProfile.put({ ...DEFAULT_PROFILE, id: 1 });
          profile = await db.userProfile.get(1);
        }
        set({ profile, loaded: true });
      } finally {
        initPromise = null;
      }
    })();
    return initPromise;
  },

  async updateProfile(updates) {
    const profile = { ...get().profile, ...updates };
    await db.userProfile.put({ ...profile, id: 1 });
    set({ profile });
  },

  async addXP(amount) {
    const p = get().profile;
    if (!p) return;
    const totalXp = p.totalXp + amount;
    const level = getLevelFromTotalXP(totalXp);
    const title = getTitle(level);
    await get().updateProfile({ xp: p.xp + amount, totalXp, level, title });
  },
}));

export default useUserStore;
