import { useLiveQuery } from 'dexie-react-hooks';
import { computeStats } from '../utils/achievements.js';

// Live lifetime stats used to evaluate boss-gate feats. null until loaded.
export function useBossStats() {
  return useLiveQuery(() => computeStats(), []) ?? null;
}
