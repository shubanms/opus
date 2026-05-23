import { useEffect } from 'react';
import useUserStore from '../store/userStore.js';

// Initialises and returns the user profile.
// Full XP/level/title logic implemented in Sprint 6.
export function useRPG() {
  const { profile, loaded, init } = useUserStore();
  useEffect(() => { init(); }, [init]);
  return { profile, loaded };
}
