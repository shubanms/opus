/* eslint-env jest */
// Mock the native IO layer so the render smoke tests exercise real component
// logic in Node without needing SQLite / audio / haptics / Health Connect.

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// expo-font in Node: report fonts as loaded so App renders past the gate.
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  loadAsync: jest.fn(async () => {}),
}));

// Stub every @expo/vector-icons set (Ionicons, …) as a plain Text so the icon
// font loader isn't exercised in Node.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return new Proxy(
    {},
    { get: () => (props) => React.createElement(Text, { ...props, children: props?.name || 'icon' }) }
  );
});

// Data layer — canned values covering both empty and populated states.
jest.mock('./native/db', () => ({
  initDb: jest.fn(),
  wipeAllData: jest.fn(),
  getExercises: jest.fn(() => [
    { name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
    { name: 'Back Squat', muscleGroup: 'quadriceps', equipment: 'barbell' },
  ]),
  getActiveWorkout: jest.fn(() => null),
  getOrCreateActiveWorkout: jest.fn(() => ({ id: 1, dateKey: '2026-07-13', startedAt: 0, finishedAt: null, name: 'Workout' })),
  addSet: jest.fn(() => 1),
  deleteSet: jest.fn(),
  getSets: jest.fn(() => []),
  finishWorkout: jest.fn(() => true),
  discardWorkout: jest.fn(),
  priorBestE1rm: jest.fn(() => 0),
  getRecentWorkouts: jest.fn(() => [{ id: 1, dateKey: '2026-07-13', setCount: 5, volume: 4200 }]),
  deleteWorkout: jest.fn(),
  reconcileAchievements: jest.fn(() => []),
  getStreak: jest.fn(() => 3),
  getTotals: jest.fn(() => ({ workouts: 12, sets: 84, totalVolume: 42000, totalXP: 5200, streak: 3, prCount: 6, hours: 18 })),
  getMuscleFrequency: jest.fn(() => [{ muscle: 'chest', sets: 20 }, { muscle: 'quadriceps', sets: 14 }, { muscle: 'upper-back', sets: 12 }]),
  getWorkoutDays: jest.fn(() => new Set(['2026-07-13', '2026-07-15'])),
  getTopExercises: jest.fn(() => [{ name: 'Bench Press', sets: 20, volume: 42000, muscleGroup: 'chest' }, { name: 'Back Squat', sets: 16, volume: 60000, muscleGroup: 'quadriceps' }]),
  getBestByExercise: jest.fn(() => [{ name: 'Bench Press', e1rm: 110, weight: 100, reps: 5 }]),
  getAllSettings: jest.fn(() => ({ onboarded: 'true' })),
  setSetting: jest.fn(),
  setSteps: jest.fn(),
  getSteps: jest.fn(() => null),
  // Reactive layer + parity accessors
  subscribeDb: jest.fn(() => () => {}),
  dbVersion: jest.fn(() => 0),
  getWeeklyVolume: jest.fn(() => [
    { weekStartMs: 1, volume: 3000 },
    { weekStartMs: 2, volume: 4200 },
    { weekStartMs: 3, volume: 3800 },
  ]),
  getAllPRs: jest.fn(() => [{ id: 1, exerciseName: 'Bench Press', type: 'e1rm', value: 110, achievedAt: Date.now() }]),
  addPR: jest.fn(),
  getExercisePRs: jest.fn(() => [{ type: 'weight', value: 100 }, { type: 'reps', value: 8 }]),
  getLastWorkingSets: jest.fn(() => [{ weight: 90, reps: 8 }, { weight: 90, reps: 6 }]),
  getExerciseSessions: jest.fn(() => [[{ weight: 90, reps: 8 }]]),
  getExercise: jest.fn(() => ({ name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell', difficulty: 'intermediate', favorite: 0, color: null, isCustom: 0 })),
  getExerciseNote: jest.fn(() => ''),
  setExerciseNote: jest.fn(),
  addCustomExercise: jest.fn(() => true),
  toggleFavorite: jest.fn(),
  setExerciseColor: jest.fn(),
  deleteCustomExercise: jest.fn(() => true),
  getExerciseE1rmSeries: jest.fn(() => [{ label: '07-01', value: 110 }, { label: '07-08', value: 115 }]),
  getExerciseVolumeSeries: jest.fn(() => [{ label: '07-01', value: 2400 }, { label: '07-08', value: 2600 }]),
  reconcileQuests: jest.fn(),
  commitWorkout: jest.fn(() => ({
    discarded: false, workoutId: 1,
    summary: { totalSets: 3, totalVolume: 2400, xpEarned: 80, durationSec: 1500 },
    prs: [{ exerciseName: 'Bench Press', type: 'weight', value: 105 }],
    prCount: 1, newAchievements: [], leveledUp: false, newLevel: 6, newTitle: 'Iron Adept',
  })),
  getWorkoutSummary: jest.fn(() => ({ totalSets: 12, totalVolume: 4200, xpEarned: 120, durationSec: 1800 })),
  setWater: jest.fn(),
  getWater: jest.fn(() => null),
  logBodyStat: jest.fn(),
  getBodyStats: jest.fn(() => [{ id: 1, date: '2026-07-16', weight: 82, bodyFat: 15, chest: 104, waist: 82, hips: 98, arms: 38, thighs: 60 }]),
  currentBodyweight: jest.fn(() => 82),
  logSleep: jest.fn(),
  getSleepLogs: jest.fn(() => [{ id: 1, date: '2026-07-16', hours: 7.5, quality: 4 }, { id: 2, date: '2026-07-15', hours: 6, quality: 3 }]),
  getStepsSeries: jest.fn(() => [{ dateKey: '2026-07-15', steps: 8000 }, { dateKey: '2026-07-16', steps: 9200 }]),
  getWaterSeries: jest.fn(() => [{ dateKey: '2026-07-15', water: 6 }, { dateKey: '2026-07-16', water: 8 }]),
  deleteBodyStat: jest.fn(),
  deleteSleepLog: jest.fn(),
  exportAllRows: jest.fn(() => ({ app: 'OPUS', version: 1, exportedAt: '2026-07-17', data: {} })),
  importAllRows: jest.fn(() => true),
  exportSetsRows: jest.fn(() => [{ date: '2026-07-16', workout: 'Push', exercise: 'Bench Press', setNumber: 1, weightKg: 100, reps: 5, rpe: 8, isWarmup: 0, note: '' }]),
  getTemplates: jest.fn(() => [{ id: 1, name: 'Push Day', exercises: ['Bench Press', 'Arnold Press'] }]),
  createTemplate: jest.fn(() => 1),
  deleteTemplate: jest.fn(),
  unlockedAchievementKeys: jest.fn(() => ['first']),
  syncAchievements: jest.fn(() => []),
  computeAchievementStats: jest.fn(() => ({
    workouts: 12, totalVolume: 42000, totalSets: 84, bestStreak: 5,
    muscleVariety: 6, prCount: 3, level: 6, earlyBird: false, nightOwl: false, customExercises: 0,
  })),
  getWeekQuestStats: jest.fn(() => ({ sessions: 2, volumeKg: 6000, sets: 20, muscleVariety: 4, legsSessions: 1, prs: 1 })),
  getQuestClaims: jest.fn(() => []),
  claimQuest: jest.fn(() => true),
  questClaimXP: jest.fn(() => 0),
  getRadarInputs: jest.fn(() => ({ maxWeight: 140, avgVolume: 5000, avgSets: 18, streak: 3, workoutsPerWeek: 3, muscleVariety: 6 })),
  getMuscleRecovery: jest.fn(() => [
    { muscle: 'chest', daysSince: 0 },
    { muscle: 'back', daysSince: 2 },
    { muscle: 'quadriceps', daysSince: null },
  ]),
  getWrappedInputs: jest.fn(() => ({
    workouts: [{ id: 1, date: '2026-07-02', status: 'completed', totalVolume: 4200, xpEarned: 120, duration: 3600 }],
    sets: [{ workoutId: 1, exerciseId: 1, weight: 100, reps: 5 }],
    prs: [{ achievedAt: new Date('2026-07-02').getTime() }],
    exName: { 1: 'Bench Press' },
  })),
}));

jest.mock('./native/sound', () => ({ playCue: jest.fn(), previewSounds: jest.fn() }));
jest.mock('./native/haptics', () => ({ tapLight: jest.fn(), success: jest.fn(), warning: jest.fn(), selection: jest.fn() }));
jest.mock('./native/widgets', () => ({ refreshWidgets: jest.fn() }));
jest.mock('./native/notifications', () => ({
  enableNotifications: jest.fn(async () => true),
  testNotification: jest.fn(async () => {}),
  scheduleDailyReminder: jest.fn(async () => {}),
}));
jest.mock('./native/healthConnect', () => ({
  healthAvailability: jest.fn(async () => 'Available'),
  connectAndReadSteps: jest.fn(async () => ({ ok: true, steps: 8000 })),
}));
// Share capture: view-shot's <ViewShot> is a passthrough view in Node, and
// captureRef / expo-sharing are no-ops so ShareSheet mounts without native code.
// virtual: these native deps aren't resolvable in the Node test env (they're
// only installed in the prebuild), so mock them without requiring resolution.
jest.mock('react-native-view-shot', () => {
  const React = require('react');
  const { View } = require('react-native');
  const ViewShot = React.forwardRef((props, ref) => React.createElement(View, { ...props, ref }));
  return { __esModule: true, default: ViewShot, captureRef: jest.fn(async () => 'file:///tmp/opus-card.png') };
}, { virtual: true });
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}), { virtual: true });
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///doc/',
  writeAsStringAsync: jest.fn(async () => {}),
  readAsStringAsync: jest.fn(async () => '{"app":"OPUS","data":{}}'),
}), { virtual: true });
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true })),
}), { virtual: true });

jest.mock('react-native-android-widget', () => ({
  requestWidgetUpdate: jest.fn(async () => {}),
  registerWidgetTaskHandler: jest.fn(),
  FlexWidget: 'FlexWidget',
  TextWidget: 'TextWidget',
}));
