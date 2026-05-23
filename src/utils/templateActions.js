import { db } from '../db/db.js';

export async function createTemplate({ name, dayOfWeek = null, exerciseIds = [] }) {
  const templateId = await db.templates.add({
    name: name.trim() || 'Routine',
    dayOfWeek,
    createdAt: Date.now(),
  });
  if (exerciseIds.length) {
    await db.templateExercises.bulkAdd(
      exerciseIds.map((exerciseId, i) => ({ templateId, exerciseId, orderIndex: i }))
    );
  }
  return templateId;
}

export async function updateTemplate(templateId, { name, dayOfWeek = null, exerciseIds = [] }) {
  await db.templates.update(templateId, { name: name.trim() || 'Routine', dayOfWeek });
  await db.templateExercises.where('templateId').equals(templateId).delete();
  if (exerciseIds.length) {
    await db.templateExercises.bulkAdd(
      exerciseIds.map((exerciseId, i) => ({ templateId, exerciseId, orderIndex: i }))
    );
  }
}

export async function deleteTemplate(templateId) {
  await db.templateExercises.where('templateId').equals(templateId).delete();
  await db.templates.delete(templateId);
}
