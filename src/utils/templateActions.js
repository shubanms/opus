import { db } from '../db/db.js';

// exercises: [{ exerciseId, targetSets, targetReps, targetWeight }]
function toLinks(templateId, exercises) {
  return exercises.map((e, i) => ({
    templateId,
    exerciseId: e.exerciseId,
    orderIndex: i,
    targetSets: e.targetSets ?? null,
    targetReps: e.targetReps ?? null,
    targetWeight: e.targetWeight ?? null,
  }));
}

export async function createTemplate({ name, dayOfWeek = null, exercises = [] }) {
  const templateId = await db.templates.add({
    name: name.trim() || 'Routine',
    dayOfWeek,
    createdAt: Date.now(),
  });
  if (exercises.length) await db.templateExercises.bulkAdd(toLinks(templateId, exercises));
  return templateId;
}

export async function updateTemplate(templateId, { name, dayOfWeek = null, exercises = [] }) {
  await db.templates.update(templateId, { name: name.trim() || 'Routine', dayOfWeek });
  await db.templateExercises.where('templateId').equals(templateId).delete();
  if (exercises.length) await db.templateExercises.bulkAdd(toLinks(templateId, exercises));
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

export async function clearDay(dayOfWeek) {
  const assigned = await db.templates.where('dayOfWeek').equals(dayOfWeek).toArray();
  for (const t of assigned) await db.templates.update(t.id, { dayOfWeek: null });
}
