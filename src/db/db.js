import Dexie from 'dexie';

export const db = new Dexie('OpusDB');

// Schema versions live here. Add new db.version() blocks for future migrations;
// never modify a version that has already shipped.
db.version(1).stores({
  exercises:
    '++id, name, muscleGroup, equipment, isCustom',
  workouts:
    '++id, date, templateId, status, duration',
  sets:
    '++id, workoutId, exerciseId, setNumber, reps, weight, completedAt',
  templates:
    '++id, name, dayOfWeek, createdAt',
  templateExercises:
    '++id, templateId, exerciseId, orderIndex',
  prs:
    '++id, exerciseId, type, value, achievedAt, workoutId',
  bodyStats:
    '++id, date, weight, bodyFat',
  sleepLogs:
    '++id, date, hours, quality',
  energyLogs:
    '++id, workoutId, level',
  userProfile:
    '++id',
  notifications:
    '++id, type, scheduledFor, sent',
});
