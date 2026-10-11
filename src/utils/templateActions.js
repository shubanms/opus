import { db } from '../db/db.js';
import useSettingsStore from '../store/settingsStore.js';
import { decideProgression } from './progression.js';
import { programById, resolveProgram, nameToIdMap } from './programs.js';
import { targetsFromSets, lastSession, canRefreshRoutine, sameLiftInStep } from './routineTargets.js';

// Where a routine came from (unindexed `templates.source`). Only 'auto' — what
// saveWorkoutAsRoutine wrote — may ever be overwritten by it.
export const ROUTINE_SOURCE = {
  auto: 'auto', user: 'user', generator: 'generator', plan: 'plan', program: 'program',
};

function currentUnit() {
  try {
    return useSettingsStore.getState().unit ?? 'kg';
  } catch {
    return 'kg';
  }
}

// A weekday holds one routine (utils/routineDays). Every write that puts a
// routine on a day takes the day off whichever routine had it — before, two
// routines sat on one day and the older one won everywhere it was shown.
async function releaseDay(dayOfWeek, keepId = null) {
  if (dayOfWeek == null) return;
  const on = await db.templates.where('dayOfWeek').equals(dayOfWeek).toArray();
  for (const t of on) {
    if (t.id !== keepId) await db.templates.update(t.id, { dayOfWeek: null });
  }
}

// Install a bundled program (utils/programs.js) as a week of routines. Resolves
// catalog exercise names → ids (built-in rows first, so a custom "Bench Press"
// can't hijack the lookup), then creates one routine per training day with the
// program's progression scheme attached, taking those weekdays from whatever
// held them — the caller confirms that first (weekdayConflicts). Routines from
// one install share a `program.run` stamp, which is what lets them share
// progress on a lift (advanceProgression). One transaction: all or nothing.
// Returns the number of routines created.
export async function installProgram(programId) {
  const program = programById(programId);
  if (!program) return 0;
  return db.transaction('rw', db.exercises, db.templates, db.templateExercises, async () => {
    const days = resolveProgram(program, nameToIdMap(await db.exercises.toArray()));
    const run = Date.now();
    for (const day of days) {
      await createTemplate({
        name: day.name,
        dayOfWeek: day.dayOfWeek,
        progression: day.progression,
        source: ROUTINE_SOURCE.program,
        program: { id: program.id, run },
        exercises: day.exercises,
      });
    }
    return days.length;
  });
}

/**
 * Save a planned week (Plan week): each day a routine on its weekday, taking
 * those days from the routines that had them. One transaction, so a failure
 * part-way can't leave half a week.
 */
export async function createWeek(days, { source = ROUTINE_SOURCE.plan } = {}) {
  return db.transaction('rw', db.templates, db.templateExercises, async () => {
    const ids = [];
    for (const day of days ?? []) ids.push(await createTemplate({ ...day, source }));
    return ids;
  });
}

// exercises: [{ exerciseId, targetSets, targetReps, targetWeight, targetRest,
// misses, weightStep }]. Everything a row carries survives a save: dropping
// `misses` reset a lift halfway to its deload, and dropping `targetRest` threw
// away Plan week's rest times on the first edit.
function toLinks(templateId, exercises) {
  return exercises.map((e, i) => ({
    templateId,
    exerciseId: e.exerciseId,
    orderIndex: i,
    targetSets: e.targetSets ?? null,
    targetReps: e.targetReps ?? null,
    targetWeight: e.targetWeight ?? null,
    targetRest: e.targetRest ?? null,
    misses: e.misses ?? 0,
    // Per-lift step (kg) — set by programs; null means "the routine's scheme".
    weightStep: e.weightStep ?? null,
  }));
}

// `autoKey` (unindexed) marks auto-generated routines and carries the muscle
// signature used to re-match a later same-group session; `source` says who
// made the routine (ROUTINE_SOURCE). Stored freely by Dexie — no migration.
export async function createTemplate({
  name, dayOfWeek = null, color = null, autoKey = null, progression = null, source = null, program = null, exercises = [],
}) {
  return db.transaction('rw', db.templates, db.templateExercises, async () => {
    await releaseDay(dayOfWeek);
    const row = {
      name: (name ?? '').trim() || 'Routine',
      dayOfWeek,
      color,
      autoKey,
      progression,
      source,
      createdAt: Date.now(),
    };
    if (program) row.program = program;
    const templateId = await db.templates.add(row);
    if (exercises.length) await db.templateExercises.bulkAdd(toLinks(templateId, exercises));
    return templateId;
  });
}

export async function updateTemplate(templateId, { name, dayOfWeek = null, color = null, autoKey, progression, source, exercises = [] }) {
  return db.transaction('rw', db.templates, db.templateExercises, async () => {
    await releaseDay(dayOfWeek, templateId);
    // Only touch autoKey / progression / source when the caller passes them,
    // so an edit that doesn't know about them preserves what's there.
    const patch = { name: (name ?? '').trim() || 'Routine', dayOfWeek, color };
    if (autoKey !== undefined) patch.autoKey = autoKey;
    if (progression !== undefined) patch.progression = progression;
    if (source !== undefined) patch.source = source;
    await db.templates.update(templateId, patch);
    await db.templateExercises.where('templateId').equals(templateId).delete();
    if (exercises.length) await db.templateExercises.bulkAdd(toLinks(templateId, exercises));
  });
}

// Save a finished (quick-start) workout as a routine. If a routine this
// function saved before under the same `autoKey` exists, update it in place
// (keeping its name unless the user edited it) so re-training a group refreshes
// rather than duplicates. It never touches a routine it didn't create — see
// canRefreshRoutine for how that used to go wrong. Returns the saved routine's
// name, or null when there's nothing to save.
export async function saveWorkoutAsRoutine({ name, autoKey = null, nameEdited = false, workout }) {
  const exercises = (workout?.exercises ?? [])
    .map((ex) => ({ exerciseId: ex.exerciseId, ...targetsFromSets(ex.sets) }))
    .filter((e) => e.exerciseId != null);
  if (!exercises.length) return null;

  return db.transaction('rw', db.templates, db.templateExercises, async () => {
    const candidates = autoKey ? await db.templates.filter((t) => canRefreshRoutine(t, autoKey)).toArray() : [];
    const existing = candidates.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0] ?? null;

    if (existing) {
      const finalName = nameEdited ? name : existing.name;
      await updateTemplate(existing.id, {
        name: finalName,
        dayOfWeek: existing.dayOfWeek ?? null,
        color: existing.color ?? null,
        autoKey,
        source: ROUTINE_SOURCE.auto,
        exercises,
      });
      return (finalName || existing.name || 'Routine').trim();
    }

    await createTemplate({ name, autoKey, source: ROUTINE_SOURCE.auto, exercises });
    return (name || 'Routine').trim();
  });
}

// After finishing a session logged against a routine, advance that routine's
// per-exercise targets by its progression scheme (utils/progression.js). Edits
// only the routine's *targets* (forward-only suggestions), so workout history
// is never touched and deletes need no revert.
//
// `opts.unit` is the user's display unit: steps, plate grids and deloads happen
// in it (defaults to the current setting). A lift with its own `weightStep`
// (programs: deadlift 5, press 2.5) steps by that. Routines installed together
// from one program move a lift they prescribe identically together.
//
// Returns null when nothing moved, else
//   { count, bumps: [{ exerciseId, action: 'increase'|'deload' }], mode, raised, deloaded }
// — word a toast from `bumps[].action` / the counts: a deload is not progress.
export async function advanceProgression(templateId, exercises, opts = {}) {
  if (!templateId) return null;
  const unit = opts.unit ?? currentUnit();
  return db.transaction('rw', db.templates, db.templateExercises, async () => {
    const tpl = await db.templates.get(templateId);
    const scheme = tpl?.progression;
    if (!scheme || !scheme.mode || scheme.mode === 'off') return null;

    const links = await db.templateExercises.where('templateId').equals(templateId).toArray();
    const workingByEx = {};
    for (const e of exercises ?? []) {
      const working = (e.sets ?? []).filter((s) => !s.isWarmup && !s.isCardio && ((s.weight ?? 0) > 0 || (s.reps ?? 0) > 0));
      workingByEx[e.exerciseId] = [...(workingByEx[e.exerciseId] ?? []), ...working];
    }

    // The other routines from the same program install, and their rows.
    let siblings = [];
    if (tpl.program?.run != null) {
      const sibIds = (await db.templates.filter((t) => t.id !== tpl.id && t.program?.run === tpl.program.run).toArray()).map((t) => t.id);
      if (sibIds.length) siblings = await db.templateExercises.where('templateId').anyOf(sibIds).toArray();
    }

    const bumps = [];
    let raised = 0;
    let deloaded = 0;
    for (const link of links) {
      const working = workingByEx[link.exerciseId];
      if (!working || !working.length) continue;
      const next = decideProgression(
        { targetSets: link.targetSets, targetReps: link.targetReps, targetWeight: link.targetWeight, misses: link.misses ?? 0 },
        working,
        { ...scheme, weightStep: link.weightStep ?? scheme.weightStep },
        { unit },
      );
      if (next.action === 'off') continue;
      const patch = { targetSets: next.targetSets, targetReps: next.targetReps, targetWeight: next.targetWeight, misses: next.misses };
      await db.templateExercises.update(link.id, patch);
      for (const sib of siblings) {
        if (sameLiftInStep(sib, link)) await db.templateExercises.update(sib.id, patch);
      }
      if (next.action === 'increase') raised += 1;
      if (next.action === 'deload') deloaded += 1;
      if (next.action === 'increase' || next.action === 'deload') {
        bumps.push({ exerciseId: link.exerciseId, action: next.action });
      }
    }
    return bumps.length ? { count: bumps.length, bumps, mode: scheme.mode, raised, deloaded } : null;
  });
}

/**
 * Targets read off the most recent session of one exercise — the builder's
 * "Fill from last session". { targetSets, targetReps, targetWeight (kg), date }
 * or null when it has never been logged.
 */
export async function lastSessionTargets(exerciseId) {
  if (exerciseId == null) return null;
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  if (!sets.length) return null;
  const workouts = (await db.workouts.bulkGet([...new Set(sets.map((s) => s.workoutId))])).filter(Boolean);
  const last = lastSession(sets, workouts);
  if (!last) return null;
  return { ...targetsFromSets(last.sets), date: last.workout.date ?? null };
}

// Quick name-only rename (leaves exercises/targets untouched).
export async function renameTemplate(templateId, name) {
  await db.templates.update(templateId, { name: (name ?? '').trim() || 'Routine' });
}

export async function deleteTemplate(templateId) {
  return db.transaction('rw', db.templates, db.templateExercises, async () => {
    const template = await db.templates.get(templateId);
    if (!template) return null;
    const links = await db.templateExercises.where('templateId').equals(templateId).toArray();
    await db.templateExercises.where('templateId').equals(templateId).delete();
    await db.templates.delete(templateId);
    return { template, links };
  });
}

/** Put a deleted routine back, exercises, order and weekday intact. */
export async function restoreTemplate(snapshot) {
  if (!snapshot?.template) return;
  await db.transaction('rw', db.templates, db.templateExercises, async () => {
    await releaseDay(snapshot.template.dayOfWeek ?? null, snapshot.template.id);
    await db.templates.put(snapshot.template);
    if (snapshot.links?.length) await db.templateExercises.bulkPut(snapshot.links);
  });
}

// An exact, independent copy: colour, progression scheme and every row's
// targets, rest, step and miss count. Not its weekday (one routine per day),
// not its autoKey (a copy is yours — "Save as routine" must never refresh it)
// and not its program stamp (it progresses on its own).
export async function duplicateTemplate(templateId) {
  return db.transaction('rw', db.templates, db.templateExercises, async () => {
    const t = await db.templates.get(templateId);
    if (!t) return null;
    const links = await db.templateExercises.where('templateId').equals(templateId).sortBy('orderIndex');
    const newId = await db.templates.add({
      name: `${t.name} copy`,
      dayOfWeek: null,
      color: t.color ?? null,
      progression: t.progression ?? null,
      source: ROUTINE_SOURCE.user,
      createdAt: Date.now(),
    });
    if (links.length) {
      await db.templateExercises.bulkAdd(links.map(({ id: _id, ...link }) => ({ ...link, templateId: newId })));
    }
    return newId;
  });
}

// Assign a template to a weekday (0=Sun..6=Sat); clears any other template on that day.
export async function assignTemplateToDay(templateId, dayOfWeek) {
  await db.transaction('rw', db.templates, async () => {
    await releaseDay(dayOfWeek, templateId);
    await db.templates.update(templateId, { dayOfWeek });
  });
}

export async function setTemplateColor(templateId, color) {
  await db.templates.update(templateId, { color: color ?? null });
}

export async function clearDay(dayOfWeek) {
  await db.transaction('rw', db.templates, () => releaseDay(dayOfWeek));
}
