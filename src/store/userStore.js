import { create } from 'zustand';
import { db } from '../db/db.js';
import { getLevelFromTotalXP, getTitle } from '../utils/rpg.js';

const DEFAULT_PROFILE = {
  name: '',
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

  async init() {
    if (get().loaded) return;
    let profile = await db.userProfile.get(1);
    if (!profile) {
      const id = await db.userProfile.add({ ...DEFAULT_PROFILE });
      profile = await db.userProfile.get(id);
    }
    set({ profile, loaded: true });
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
