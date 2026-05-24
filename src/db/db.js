import Dexie from 'dexie';

export const db = new Dexie('OpusDB');

// Schema versions live here. Add new db.version() blocks for future migrations;
// never modify a version that has already shipped.
db.version(1).stores({
  exercises:
    '++id, name, muscleGroup, equipment, isCustom',
});

// v2: adds difficulty index; clears exercises so seed re-runs with new fields
db.version(2).stores({
  exercises:
    '++id, name, muscleGroup, equipment, isCustom, difficulty',
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
}).upgrade(tx => tx.table('exercises').clear());

// v3: index workouts.createdAt (used by useWorkouts ordering)
db.version(3).stores({
  workouts:
    '++id, date, templateId, status, duration, createdAt',
});

// v4: add per-exercise targets to templateExercises (sets/reps/weight)
db.version(4).stores({
  templateExercises:
    '++id, templateId, exerciseId, orderIndex, targetSets, targetReps, targetWeight',
});

// v5: sticky per-exercise coaching notes. (exercises.favorite/color, sets.note,
// workouts.color are unindexed fields — no schema change needed for those.)
db.version(5).stores({
  exerciseNotes:
    '++id, exerciseId, text, updatedAt',
});

// v6: unlocked achievements
db.version(6).stores({
  achievements:
    '++id, key, unlockedAt',
});
