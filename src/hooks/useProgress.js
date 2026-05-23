import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';

// Returns personal records for an exercise, newest first.
export function usePRs(exerciseId) {
  return useLiveQuery(
    () => exerciseId
      ? db.prs.where('exerciseId').equals(exerciseId).reverse().sortBy('achievedAt')
      : [],
    [exerciseId]
  ) ?? [];
}

// Returns body stat entries newest-first.
export function useBodyStats() {
  return useLiveQuery(
    () => db.bodyStats.orderBy('date').reverse().toArray(),
    []
  ) ?? [];
}

// Stub — volume aggregation implemented in Sprint 8
export function useVolumeByWeek() { return []; }
