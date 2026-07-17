import { db } from '../db/db.js';
import { decideProgression } from './progression.js';

// exercises: [{ exerciseId, targetSets, targetReps, targetWeight }]
function toLinks(templateId, exercises) {
  return exercises.map((e, i) => ({
    templateId,
    exerciseId: e.exerciseId,
    orderIndex: i,
    targetSets: e.targetSets ?? null,
    targetReps: e.targetReps ?? null,
    targetWeight: e.targetWeight ?? null,
    targetRest: e.targetRest ?? null,
  }));
}

// `autoKey` (unindexed) marks auto-generated routines and carries the muscle
// signature used to re-match a later same-group session. Stored freely by Dexie
// — no schema migration needed.
export async function createTemplate({ name, dayOfWeek = null, color = null, autoKey = null, progression = null, exercises = [] }) {
  const templateId = await db.templates.add({
    name: name.trim() || 'Routine',
    dayOfWeek,
    color,
    autoKey,
    progression,
    createdAt: Date.now(),
  });
  if (exercises.length) await db.templateExercises.bulkAdd(toLinks(templateId, exercises));
  return templateId;
}

export async function updateTemplate(templateId, { name, dayOfWeek = null, color = null, autoKey, progression, exercises = [] }) {
  // Only touch autoKey when the caller passes it, so a manual edit from the
  // builder (which never sends it) preserves any existing signature.
  const patch = { name: name.trim() || 'Routine', dayOfWeek, color };
  if (autoKey !== undefined) patch.autoKey = autoKey;
  if (progression !== undefined) patch.progression = progression;
  await db.templates.update(templateId, patch);
  await db.templateExercises.where('templateId').equals(templateId).delete();
  if (exercises.length) await db.templateExercises.bulkAdd(toLinks(templateId, exercises));
}

// Derive per-exercise targets from a finished session's logged working sets:
// targetSets = working-set count, targetReps = median reps, targetWeight = top
// working-set weight (kg).
function targetsFromExercise(ex) {
  const working = (ex.sets ?? []).filter((s) => !s.isWarmup);
  const reps = working.map((s) => s.reps ?? 0).filter((n) => n > 0).sort((a, b) => a - b);
  const median = reps.length ? reps[Math.floor(reps.length / 2)] : null;
  const maxWeight = working.reduce((m, s) => Math.max(m, s.weight ?? 0), 0);
  return {
    exerciseId: ex.exerciseId,
    targetSets: working.length || null,
    targetReps: median,
    targetWeight: maxWeight > 0 ? maxWeight : null,
  };
}

// Save a finished (quick-start) workout as a routine. If an auto-routine with
// the same `autoKey` exists, update it in place (keeping its name unless the
// user edited it) so re-training a group refreshes rather than duplicates.
// Returns the saved routine's name, or null when there's nothing to save.
export async function saveWorkoutAsRoutine({ name, autoKey = null, nameEdited = false, workout }) {
  const exercises = (workout?.exercises ?? [])
    .map(targetsFromExercise)
    .filter((e) => e.exerciseId != null);
  if (!exercises.length) return null;

  const existing = autoKey
    ? (await db.templates.filter((t) => t.autoKey === autoKey).toArray())[0] ?? null
    : null;

  if (existing) {
    const finalName = nameEdited ? name : existing.name;
    await updateTemplate(existing.id, {
      name: finalName,
      dayOfWeek: existing.dayOfWeek ?? null,
      color: existing.color ?? null,
      autoKey,
      exercises,
    });
    return (finalName || existing.name || 'Routine').trim();
  }

  await createTemplate({ name, autoKey, exercises });
  return (name || 'Routine').trim();
}

// After finishing a session logged against a routine, advance that routine's
// per-exercise targets by its progression scheme (utils/progression.js). Edits
// only the routine's *targets* (forward-only suggestions), so workout history
// is never touched and deletes need no revert. Returns a summary for a toast,
// or null when there's nothing to advance.
export async function advanceProgression(templateId, exercises) {
  if (!templateId) return null;
  const tpl = await db.templates.get(templateId);
  const scheme = tpl?.progression;
  if (!scheme || !scheme.mode || scheme.mode === 'off') return null;

  const links = await db.templateExercises.where('templateId').equals(templateId).toArray();
  const workingByEx = {};
  for (const e of exercises ?? []) {
    workingByEx[e.exerciseId] = (e.sets ?? []).filter((s) => !s.isWarmup && ((s.weight ?? 0) > 0 || (s.reps ?? 0) > 0));
  }

  const bumps = [];
  for (const link of links) {
    const working = workingByEx[link.exerciseId];
    if (!working || !working.length) continue;
    const next = decideProgression(
      { targetSets: link.targetSets, targetReps: link.targetReps, targetWeight: link.targetWeight, misses: link.misses ?? 0 },
      working,
      scheme
    );
    if (next.action === 'off') continue;
    await db.templateExercises.update(link.id, {
      targetSets: next.targetSets, targetReps: next.targetReps, targetWeight: next.targetWeight, misses: next.misses,
    });
    if (next.action === 'increase' || next.action === 'deload') {
      bumps.push({ exerciseId: link.exerciseId, action: next.action });
    }
  }
  return bumps.length ? { count: bumps.length, bumps, mode: scheme.mode } : null;
}

// Quick name-only rename (leaves exercises/targets untouched).
export async function renameTemplate(templateId, name) {
  await db.templates.update(templateId, { name: (name ?? '').trim() || 'Routine' });
}

export async function deleteTemplate(templateId) {
  await db.templateExercises.where('templateId').equals(templateId).delete();
  await db.templates.delete(templateId);
}

export async function duplicateTemplate(templateId) {
  const t = await db.templates.get(templateId);
  if (!t) return null;
  const links = await db.templateExercises.where('templateId').equals(templateId).sortBy('orderIndex');
  const newId = await db.templates.add({
    name: `${t.name} copy`,
    dayOfWeek: null,
    createdAt: Date.now(),
  });
  if (links.length) {
    await db.templateExercises.bulkAdd(
      links.map((l) => ({
        templateId: newId,
        exerciseId: l.exerciseId,
        orderIndex: l.orderIndex,
        targetSets: l.targetSets ?? null,
        targetReps: l.targetReps ?? null,
        targetWeight: l.targetWeight ?? null,
      }))
    );
  }
  return newId;
}

// Assign a template to a weekday (0=Sun..6=Sat); clears any other template on that day.
export async function assignTemplateToDay(templateId, dayOfWeek) {
  const clash = await db.templates.where('dayOfWeek').equals(dayOfWeek).toArray();
  for (const c of clash) {
    if (c.id !== templateId) await db.templates.update(c.id, { dayOfWeek: null });
  }
  await db.templates.update(templateId, { dayOfWeek });
}

export async function setTemplateColor(templateId, color) {
  await db.templates.update(templateId, { color: color ?? null });
}

export async function clearDay(dayOfWeek) {
  const assigned = await db.templates.where('dayOfWeek').equals(dayOfWeek).toArray();
  for (const t of assigned) await db.templates.update(t.id, { dayOfWeek: null });
}
