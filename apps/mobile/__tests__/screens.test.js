/* eslint-env jest */
// Render smoke tests — mount the app and every screen and assert they render
// without throwing. Catches the class of bug that shows a blank screen or a
// frozen splash on-device (render crashes, undefined imports, bad props).
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
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
import WeekPlannerSheet from '../components/workout/WeekPlannerSheet';
import TemplateEditor from '../components/workout/TemplateEditor';
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
import ExerciseDetailSheet from '../components/exercise/ExerciseDetailSheet';
import ExerciseFormSheet from '../components/exercise/ExerciseFormSheet';
import MuscleFrequency from '../components/progress/MuscleFrequency';
import Heatmap from '../components/progress/Heatmap';
import BodyStatsForm from '../components/progress/BodyStatsForm';
import SleepForm from '../components/progress/SleepForm';
import EquipmentModal from '../components/settings/EquipmentModal';
import AchievementsModal from '../components/profile/AchievementsModal';
import WeeklyRecap from '../components/home/WeeklyRecap';
import Tour from '../components/tour/Tour';
import CoachMark from '../components/coach/CoachMark';

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
  it('TemplatesModal lists saved routines + generate + plan week', () => {
    const { getByText } = render(<TemplatesModal visible onClose={() => {}} onStart={() => {}} />);
    expect(getByText('Generate a routine')).toBeTruthy();
    expect(getByText('Plan my week')).toBeTruthy();
    expect(getByText('Push Day')).toBeTruthy();
  });
  it('WeekPlannerSheet shows splits + generates a week', () => {
    const { getByText, queryAllByText } = render(<WeekPlannerSheet visible onClose={() => {}} />);
    expect(getByText('Plan my week')).toBeTruthy();
    expect(getByText('Push · Pull · Legs')).toBeTruthy();
    expect(getByText('Full Body')).toBeTruthy();
    fireEvent.press(getByText('Generate week'));
    // A generated week renders per-day cards (e.g. "Push A") + a Save button.
    expect(queryAllByText(/Save week/).length).toBeGreaterThan(0);
  });
  it('TemplateEditor loads a routine for editing', () => {
    const { getByText, getByDisplayValue } = render(<TemplateEditor visible templateId={1} onClose={() => {}} />);
    expect(getByText('Edit routine')).toBeTruthy();
    expect(getByDisplayValue('Push Day')).toBeTruthy();
    expect(getByText('Save routine')).toBeTruthy();
  });
  it('Onboarding gathers the full profile then starts', () => {
    const { getByText } = render(<Onboarding onDone={() => {}} />);
    expect(getByText('Build your masterpiece.')).toBeTruthy();
    // Profile-gathering fields (parity with the PWA onboarding).
    expect(getByText('Bodyweight')).toBeTruthy();
    expect(getByText('Height')).toBeTruthy();
    expect(getByText('Age')).toBeTruthy();
    expect(getByText('Sex')).toBeTruthy();
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

describe('exercise detail + custom CRUD', () => {
  it('ExerciseDetailSheet shows records + charts + how-to', () => {
    const { getByText } = render(<ExerciseDetailSheet visible exerciseName="Bench Press" onClose={() => {}} onAddToWorkout={() => {}} />);
    expect(getByText('Records')).toBeTruthy();
    expect(getByText('Heaviest weight')).toBeTruthy();
    expect(getByText('Watch how-to on YouTube')).toBeTruthy();
    expect(getByText('Add to workout')).toBeTruthy();
  });

  it('ExerciseFormSheet renders the create form', () => {
    const { getByText } = render(<ExerciseFormSheet visible onClose={() => {}} onCreated={() => {}} />);
    expect(getByText('New exercise')).toBeTruthy();
    expect(getByText('Create exercise')).toBeTruthy();
  });
});

describe('progress tabs', () => {
  it('Overview shows KPIs, muscle focus + training calendar', () => {
    const { getByText } = renderScreen(ProgressScreen);
    expect(getByText('Muscle focus')).toBeTruthy();
    expect(getByText('Training calendar')).toBeTruthy();
    expect(getByText('Hours')).toBeTruthy();
  });

  it('By Exercise tab lists top exercises', () => {
    const { getByText } = renderScreen(ProgressScreen);
    fireEvent.press(getByText('By Exercise'));
    expect(getByText('Top exercises')).toBeTruthy();
    expect(getByText('Back Squat')).toBeTruthy();
  });

  it('MuscleFrequency + Heatmap render standalone', () => {
    expect(() => render(<MuscleFrequency data={[{ muscle: 'chest', sets: 20 }, { muscle: 'calves', sets: 4 }]} />)).not.toThrow();
    expect(() => render(<Heatmap days={new Set(['2026-07-13', '2026-07-15'])} />)).not.toThrow();
  });

  it('Body tab shows measurements + log buttons', () => {
    const { getByText } = renderScreen(ProgressScreen);
    fireEvent.press(getByText('Body'));
    expect(getByText('Latest measurements')).toBeTruthy();
    expect(getByText('Body entries')).toBeTruthy();
    expect(getByText('Sleep entries')).toBeTruthy();
  });

  it('BodyStatsForm + SleepForm render', () => {
    const bs = render(<BodyStatsForm visible onClose={() => {}} />);
    expect(bs.getByText('Body stats')).toBeTruthy();
    const sf = render(<SleepForm visible onClose={() => {}} />);
    expect(sf.getByText('Sleep')).toBeTruthy();
  });
});

describe('settings parity (Phase D)', () => {
  it('Settings shows profile fields + equipment', () => {
    const { getByText } = renderScreen(SettingsScreen);
    expect(getByText('Bodyweight')).toBeTruthy();
    expect(getByText('Sex')).toBeTruthy();
    expect(getByText('Equipment & plates')).toBeTruthy();
  });

  it('EquipmentModal shows locations + plates', () => {
    const { getByText } = render(<EquipmentModal visible onClose={() => {}} />);
    expect(getByText('Equipment & plates')).toBeTruthy();
    expect(getByText('Gym')).toBeTruthy();
    expect(getByText('Bar weight')).toBeTruthy();
  });

  it('Settings shows the Data export/import card', () => {
    const { getByText } = renderScreen(SettingsScreen);
    expect(getByText('Export backup (JSON)')).toBeTruthy();
    expect(getByText('Import backup')).toBeTruthy();
    expect(getByText('Export sets (CSV)')).toBeTruthy();
  });

  it('About shows a real version and no Health Connect card', () => {
    const { getByText, queryByText } = renderScreen(SettingsScreen);
    expect(getByText(/v\d+\.\d+\.\d+/)).toBeTruthy(); // real semver, not a hardcoded string
    expect(queryByText('Health Connect')).toBeNull(); // removed
    expect(queryByText(/@opus\/core/)).toBeNull(); // no shared-logic mention
  });
});

describe('profile compaction (on-device polish)', () => {
  it('Profile shows an achievements preview + View all', () => {
    const { getByText } = renderScreen(ProfileScreen);
    expect(getByText(/View all achievements/)).toBeTruthy();
  });

  it('AchievementsModal lists the full trophy case', () => {
    const { getByText } = render(<AchievementsModal visible unlocked={new Set(['first'])} onClose={() => {}} />);
    expect(getByText('Achievements')).toBeTruthy();
  });
});

describe('home richness (Phase E)', () => {
  it('Home shows the weekly recap + Today card + deck', () => {
    const { getByText } = renderScreen(HomeScreen);
    expect(getByText('Your week so far')).toBeTruthy();
    expect(getByText('Activity')).toBeTruthy(); // deck tab
    expect(getByText('Ready to train?')).toBeTruthy();
  });

  it('WeeklyRecap renders this week\'s stats', () => {
    const { getByText } = render(<WeeklyRecap />);
    expect(getByText('Your week so far')).toBeTruthy();
    expect(getByText('Sessions')).toBeTruthy();
  });
});

describe('feel / sound cues (Phase G)', () => {
  // The dedicated milestone cues are pre-rendered WAV assets; guard that each
  // one ships and is a valid, non-empty PCM WAV so the release build won't fail
  // to bundle a missing require or ship a corrupt/silent asset.
  const NEW_CUES = ['pr', 'achievement', 'quest', 'rest', 'anthem', 'themeOpen'];
  for (const name of NEW_CUES) {
    it(`${name}.wav is a valid PCM WAV asset`, () => {
      const file = path.join(__dirname, '..', 'assets', 'sound', `${name}.wav`);
      const b = fs.readFileSync(file);
      expect(b.toString('ascii', 0, 4)).toBe('RIFF');
      expect(b.toString('ascii', 8, 12)).toBe('WAVE');
      expect(b.readUInt16LE(20)).toBe(1); // PCM
      expect(b.length - 44).toBeGreaterThan(4000); // has real audio data
    });
  }
});

describe('guided tour + coach marks (Phase F)', () => {
  it('Tour shows the first step and advances', async () => {
    const { getByText } = render(<Tour navigation={{ navigate: () => {} }} onDone={() => {}} />);
    expect(getByText('Log your workouts')).toBeTruthy();
    fireEvent.press(getByText('Next'));
    await waitFor(() => expect(getByText('Level up')).toBeTruthy());
  });

  it('CoachMark renders the tip for a tab', () => {
    const { getByText } = render(<CoachMark route="Home" />);
    expect(getByText('Got it')).toBeTruthy();
  });

  it('CoachMark renders nothing for an unknown route', () => {
    const { toJSON } = render(<CoachMark route="Nope" />);
    expect(toJSON()).toBeNull();
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
