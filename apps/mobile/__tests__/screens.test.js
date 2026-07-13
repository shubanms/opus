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
