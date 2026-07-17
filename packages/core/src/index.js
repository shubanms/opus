// @opus/core — shared, framework-agnostic domain logic for OPUS.
// Consume either namespaced (`import { rpg } from '@opus/core'`) or by subpath
// (`import { todayKey } from '@opus/core/dateKey'`). No DOM, DB, or platform deps.
export * as rpg from './rpg.js';
export * as overload from './overload.js';
export * as quests from './quests.js';
export * as oneRepMax from './oneRepMax.js';
export * as supersets from './supersets.js';
export * as routineName from './routineName.js';
export * as dateKey from './dateKey.js';
export * as plateCalc from './plateCalc.js';
export * as inventory from './inventory.js';
export * as restStats from './restStats.js';
export * as csv from './csv.js';
export * as reorder from './reorder.js';
export * as ambient from './ambient.js';
export * as bosses from './bosses.js';
export * as decay from './decay.js';
export * as staleRoutine from './staleRoutine.js';
export * as mascot from './mascot.js';
export * as workoutSession from './workoutSession.js';
export * as units from './units.js';
export * as routineGenerator from './routineGenerator.js';
export * as weekPlanner from './weekPlanner.js';
export * as goals from './goals.js';
export * as volume from './volume.js';
export * as snapshots from './snapshots.js';
export * as wrapped from './wrapped.js';
export * as achievements from './achievements.js';
export * as shareCard from './shareCard.js';
export * as prs from './prs.js';
export * as setDiff from './setDiff.js';
export * as calendar from './calendar.js';
// seedExercises has a single default export (the array), so re-export it as a
// named binding — this lets consumers use the bare `import { seedExercises }
// from '@opus/core'` (resolved via the package main field) instead of the
// `@opus/core/seedExercises` subpath, which Metro (SDK 52, package `exports`
// off by default) can't resolve.
export { default as seedExercises } from './seedExercises.js';
