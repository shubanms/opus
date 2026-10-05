import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import { useTodayKey } from './useTodayKey.js';
import { todayPlan } from '../utils/todayPlan.js';

// A routine's exercises in order: the exercise row (its `id` is the exercise
// id) plus everything the routine says about it — targets in kg, rest in
// seconds (Plan week sets it; the session's rest timer uses it), the miss
// count toward a deload, and a per-lift progression step where a program set
// one. Everything here survives an edit, so everything has to be loaded.
export async function loadExercises(templateId) {
  const links = await db.templateExercises.where('templateId').equals(templateId).sortBy('orderIndex');
  const rows = await db.exercises.bulkGet(links.map((l) => l.exerciseId));
  const exercises = [];
  links.forEach((link, i) => {
    const ex = rows[i];
    if (!ex) return;
    exercises.push({
      ...ex,
      targetSets: link.targetSets ?? null,
      targetReps: link.targetReps ?? null,
      targetWeight: link.targetWeight ?? null,
      targetRest: link.targetRest ?? null,
      misses: link.misses ?? 0,
      weightStep: link.weightStep ?? null,
    });
  });
  return exercises;
}

// templateId → the date key of the most recent workout logged against it.
async function lastDoneByTemplate() {
  const out = {};
  await db.workouts.each((w) => {
    if (w.templateId == null || !w.date) return;
    if (!out[w.templateId] || w.date > out[w.templateId]) out[w.templateId] = w.date;
  });
  return out;
}

// All templates (newest first) with their exercise details + targets joined
// in, and `lastDone` (dateKey | null) — when each was last trained.
export function useTemplatesWithExercises() {
  return useLiveQuery(async () => {
    const templates = await db.templates.orderBy('createdAt').reverse().toArray();
    const lastDone = await lastDoneByTemplate();
    const result = [];
    for (const t of templates) {
      result.push({ ...t, lastDone: lastDone[t.id] ?? null, exercises: await loadExercises(t.id) });
    }
    return result;
  }, []) ?? [];
}

// Today's recommendation: assigned template, rest day, or fresh start. The
// decision is pure (utils/todayPlan); `today` is the LOCAL date key and rolls
// over at midnight / on resume, so a phone left open overnight moves on.
//
// `type: 'loading'` until the first answer. The placeholder used to be
// 'fresh', and the "Today's workout" app shortcut (/workout?start=today)
// acted on it in the first render — starting an empty session on a day that
// had a routine planned.
const LOADING = { type: 'loading', reason: '' };

export function useToday() {
  const today = useTodayKey();
  return useLiveQuery(async () => {
    const dates = [];
    await db.workouts.each((w) => { if (w.date) dates.push(w.date); });
    const templates = await db.templates.toArray();
    const plan = todayPlan({ dates, today, templates });
    if (plan.type === 'template') {
      return { ...plan, template: { ...plan.template, exercises: await loadExercises(plan.template.id) } };
    }
    return plan;
  }, [today]) ?? LOADING;
}
