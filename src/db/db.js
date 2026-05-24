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

// v7: daily activity (steps + water), one row per date
db.version(7).stores({
  dailyLogs:
    '++id, date, steps, water',
});

// v8: claimed weekly quests (XP reward is permanent, summed in recomputeProfile)
db.version(8).stores({
  questClaims:
    '++id, weekKey',
});

// When a newer tab/build wants to upgrade the schema, close this (older)
// connection and reload so the upgrade isn't blocked and left stuck.
if (typeof window !== 'undefined') {
  db.on('versionchange', () => {
    try { db.close(); } catch { /* ignore */ }
    window.location.reload();
  });
  db.on('blocked', () => {
    console.warn('OpusDB upgrade is blocked by another open tab.');
  });
}
