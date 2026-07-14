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
  getStreak: jest.fn(() => 3),
  getTotals: jest.fn(() => ({ workouts: 12, sets: 84, totalVolume: 42000, totalXP: 5200, streak: 3 })),
  getBestByExercise: jest.fn(() => [{ name: 'Bench Press', e1rm: 110, weight: 100, reps: 5 }]),
  getAllSettings: jest.fn(() => ({})),
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
  getWorkoutSummary: jest.fn(() => ({ totalSets: 12, totalVolume: 4200, xpEarned: 120, durationSec: 1800 })),
  setWater: jest.fn(),
  getWater: jest.fn(() => null),
  logBodyStat: jest.fn(),
  getBodyStats: jest.fn(() => []),
  currentBodyweight: jest.fn(() => null),
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
jest.mock('react-native-android-widget', () => ({
  requestWidgetUpdate: jest.fn(async () => {}),
  registerWidgetTaskHandler: jest.fn(),
  FlexWidget: 'FlexWidget',
  TextWidget: 'TextWidget',
}));
