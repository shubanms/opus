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
import LineChart from '../components/progress/LineChart';
import BarChart from '../components/progress/BarChart';
import ProgressionModal from '../components/profile/ProgressionModal';
import HallOfRecordsModal from '../components/profile/HallOfRecordsModal';
import QuestBoard from '../components/home/QuestBoard';

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
});

describe('home quest board', () => {
  it('renders this week\'s quests', () => {
    const { getByText } = render(<QuestBoard />);
    expect(getByText("This week's quests")).toBeTruthy();
  });
});
