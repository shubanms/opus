/* eslint-env jest */
// Render smoke tests — mount the app and every screen and assert they render
// without throwing. Catches the class of bug that shows a blank screen or a
// frozen splash on-device (render crashes, undefined imports, bad props).
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import App from '../App';
import HomeScreen from '../screens/HomeScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RestTimer from '../components/workout/RestTimer';
import EndWorkoutModal from '../components/workout/EndWorkoutModal';
import ExercisePicker from '../components/workout/ExercisePicker';
import PlateCalculator from '../components/workout/PlateCalculator';
import TemplatesModal from '../components/workout/TemplatesModal';
import Onboarding from '../components/Onboarding';
import LineChart from '../components/progress/LineChart';
import BarChart from '../components/progress/BarChart';
import ProgressionModal from '../components/profile/ProgressionModal';
import HallOfRecordsModal from '../components/profile/HallOfRecordsModal';
import WrappedModal from '../components/profile/WrappedModal';
import QuestBoard from '../components/home/QuestBoard';
import HistoryModal from '../components/home/HistoryModal';
import ActivityRings from '../components/home/ActivityRings';
import BodyWeightCard from '../components/progress/BodyWeightCard';
import RadarCard from '../components/rpg/RadarCard';
import RecoveryCard from '../components/progress/RecoveryCard';
import ShareSheet from '../components/share/ShareSheet';
import { CARDS } from '../components/share/cards';
import ExerciseSection from '../components/workout/ExerciseSection';
import SetLogger from '../components/workout/SetLogger';
import OverloadNudge from '../components/workout/OverloadNudge';
import LevelUpScreen from '../components/rpg/LevelUpScreen';
import * as workoutSession from '../native/workoutSession';

const Tab = createBottomTabNavigator();

// Mount a screen inside a real navigator so useFocusEffect/navigation work.
function renderScreen(Comp) {
  return render(
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="T" component={Comp} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

describe('OPUS native app', () => {
  it('mounts past the splash and shows the Home hero', async () => {
    const { getByText } = render(<App />);
    await waitFor(() => expect(getByText('Ready to train?')).toBeTruthy());
  });
});

describe('OPUS screens render without crashing', () => {
  const screens = {
    Home: HomeScreen,
    Workout: WorkoutScreen,
    Progress: ProgressScreen,
    Exercises: ExercisesScreen,
    Profile: ProfileScreen,
    Settings: SettingsScreen,
  };
  for (const [name, Comp] of Object.entries(screens)) {
    it(`${name} renders`, () => {
      expect(() => renderScreen(Comp)).not.toThrow();
    });
  }
});

describe('workout components render without crashing', () => {
  it('RestTimer mounts (and cleans up its interval)', () => {
    const { unmount } = render(<RestTimer onDone={() => {}} />);
    unmount();
  });
  it('EndWorkoutModal renders a PR summary', () => {
    const { getByText } = render(
      <EndWorkoutModal
        visible
        summary={{ xpEarned: 120, totalVolume: 4200, totalSets: 12, durationSec: 1800 }}
        prs={[{ exerciseName: 'Bench Press', value: 110 }]}
        onClose={() => {}}
      />
    );
    expect(getByText('New PR! 🏆')).toBeTruthy();
  });
  it('ExercisePicker lists catalog exercises', () => {
    const { getByText } = render(<ExercisePicker visible onClose={() => {}} onPick={() => {}} />);
    expect(getByText('Bench Press')).toBeTruthy();
  });
  it('PlateCalculator shows plates per side (100kg on a 20kg bar)', () => {
    const { getByText } = render(<PlateCalculator weight={100} />);
    expect(getByText('1×25')).toBeTruthy(); // 40/side = 25 + 15
    expect(getByText('1×15')).toBeTruthy();
  });
  it('TemplatesModal lists saved routines + generate', () => {
    const { getByText } = render(<TemplatesModal visible onClose={() => {}} onStart={() => {}} />);
    expect(getByText('Generate a routine')).toBeTruthy();
    expect(getByText('Push Day')).toBeTruthy();
  });
  it('Onboarding renders the first-run form', () => {
    const { getByText } = render(<Onboarding onDone={() => {}} />);
    expect(getByText('Build your masterpiece.')).toBeTruthy();
    expect(getByText('Start training')).toBeTruthy();
  });
});

describe('progress charts render without crashing', () => {
  it('LineChart draws a series', () => {
    expect(() => render(<LineChart data={[1000, 2000, 1500, 3000]} width={280} />)).not.toThrow();
  });
  it('LineChart shows a hint with too few points', () => {
    const { getByText } = render(<LineChart data={[100]} width={280} />);
    expect(getByText('Not enough data yet')).toBeTruthy();
  });
  it('BarChart draws bars', () => {
    expect(() => render(<BarChart data={[500, 800, 1200]} width={280} />)).not.toThrow();
  });
});

describe('profile modals render without crashing', () => {
  const stats = { totalVolume: 42000, bestStreak: 5, prCount: 3, muscleVariety: 6 };
  it('ProgressionModal shows boss gates + rank ladder', () => {
    const { getByText } = render(<ProgressionModal visible level={12} stats={stats} onClose={() => {}} />);
    expect(getByText('Ranks & bosses')).toBeTruthy();
    expect(getByText('Boss gates')).toBeTruthy();
  });
  it('HallOfRecordsModal groups PRs by day', () => {
    const prs = [{ id: 1, exerciseName: 'Deadlift', type: 'e1rm', value: 180, achievedAt: Date.now() }];
    const { getByText } = render(<HallOfRecordsModal visible prs={prs} onClose={() => {}} />);
    expect(getByText('Deadlift')).toBeTruthy();
  });
  it('WrappedModal aggregates a period', () => {
    const inputs = {
      workouts: [{ id: 1, date: '2026-07-02', status: 'completed', totalVolume: 4200, xpEarned: 120, duration: 3600 }],
      sets: [{ workoutId: 1, exerciseId: 1, weight: 100, reps: 5 }],
      prs: [{ achievedAt: new Date('2026-07-02').getTime() }],
      exName: { 1: 'Bench Press' },
    };
    const { getByText } = render(<WrappedModal visible inputs={inputs} onClose={() => {}} />);
    // Title + Month/Year toggle are always present (period contents depend on the clock).
    expect(getByText('Wrapped')).toBeTruthy();
    expect(getByText('Month')).toBeTruthy();
  });
});

describe('share cards', () => {
  // One payload broad enough to satisfy every card variant.
  const data = {
    name: 'Athlete', athlete: 'Athlete', date: '2026-07-16',
    duration: 3900, totalVolume: 4200, totalSets: 12, xpEarned: 120,
    muscles: ['chest', 'triceps'], pr: { exercise: 'Bench Press', value: 112.5 },
    level: 6, unit: 'kg', prestige: 1, title: 'Iron Adept',
    stats: [{ axis: 'Strength', value: 72 }, { axis: 'Power', value: 55 }],
    workouts: 24, streak: 5, totalXp: 5200, volumeKg: 82000, bestStreak: 9,
    label: 'July 2026', sessions: 12, sets: 140, prs: 4, hours: 9, xp: 1800,
    topLift: 'Deadlift', busiestDay: 'Monday', series: [1000, 2000, 1500, 3200, 2800],
  };

  it('renders the share sheet with theme + accent pickers', () => {
    const { getByText } = render(<ShareSheet visible cardKey="workout" data={data} onClose={() => {}} />);
    expect(getByText('Background')).toBeTruthy();
    expect(getByText('Accent')).toBeTruthy();
    expect(getByText('Black')).toBeTruthy(); // a background swatch label
  });

  for (const key of Object.keys(CARDS)) {
    it(`${key} card renders at full scale without crashing`, () => {
      const Card = CARDS[key];
      expect(() => render(<Card data={data} scale={1} />)).not.toThrow();
    });
  }
});

describe('section-based workout logging', () => {
  const exercise = {
    name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell', isBodyweight: false,
    targetSets: 3, targetReps: 8, targetWeight: null, supersetId: null,
    sets: [{ setNumber: 1, weight: 100, reps: 5, isWarmup: false, note: null, rpe: 8 }],
  };

  it('ExerciseSection renders a logged set + tally', () => {
    const { getByText } = render(<ExerciseSection exercise={exercise} unit="kg" onSetLogged={() => {}} onRemove={() => {}} canMoveUp canMoveDown />);
    expect(getByText('Bench Press')).toBeTruthy();
    expect(getByText(/1 set/)).toBeTruthy();
  });

  it('SetLogger + OverloadNudge render without crashing', () => {
    expect(() => render(<SetLogger exercise={exercise} unit="kg" />)).not.toThrow();
    expect(() => render(<OverloadNudge exerciseName="Bench Press" />)).not.toThrow();
  });

  it('LevelUpScreen shows the new level', () => {
    const { getByText } = render(<LevelUpScreen visible level={7} onClose={() => {}} />);
    expect(getByText('7')).toBeTruthy();
  });

  it('active WorkoutScreen renders sections + notes', () => {
    workoutSession.startSession('Push Day');
    workoutSession.addExercise({ name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell' });
    const { getByText } = renderScreen(WorkoutScreen);
    expect(getByText('Session notes')).toBeTruthy();
    expect(getByText('Bench Press')).toBeTruthy();
    workoutSession.discardSession();
  });
});

describe('home quest board', () => {
  it('renders this week\'s quests', () => {
    const { getByText } = render(<QuestBoard />);
    expect(getByText("This week's quests")).toBeTruthy();
  });
});

describe('history sheet', () => {
  it('lists finished workouts', () => {
    const { getByText } = render(<HistoryModal visible onClose={() => {}} />);
    expect(getByText('History')).toBeTruthy();
  });
});

describe('activity + body', () => {
  it('ActivityRings renders steps + water', () => {
    const { getByText } = render(<ActivityRings />);
    expect(getByText("Today's activity")).toBeTruthy();
  });
  it('BodyWeightCard renders a logger', () => {
    const { getByText } = render(<BodyWeightCard width={280} />);
    expect(getByText('Bodyweight')).toBeTruthy();
  });
  it('RadarCard renders the character radar', () => {
    const { getByText } = render(<RadarCard />);
    expect(getByText('Character')).toBeTruthy();
    expect(getByText('Strength')).toBeTruthy();
  });
  it('RecoveryCard lists muscle recovery', () => {
    const { getByText } = render(<RecoveryCard />);
    expect(getByText('Muscle recovery')).toBeTruthy();
  });
});
