import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './theme';
import { initDb } from './native/db';
import HomeScreen from './screens/HomeScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import ProgressScreen from './screens/ProgressScreen';
import ExercisesScreen from './screens/ExercisesScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.gold,
    background: colors.bg,
    card: colors.obsidian,
    text: colors.textPrimary,
    border: colors.ivory,
    notification: colors.ember,
  },
};

const ICON = {
  Home: 'home',
  Progress: 'stats-chart',
  Workout: 'add-circle',
  Exercises: 'barbell',
  Profile: 'person',
  Settings: 'settings',
};

export default function App() {
  useEffect(() => {
    try {
      initDb();
    } catch (e) {
      // Non-fatal: screens guard their own reads and show empty states.
      console.warn('DB init failed', e);
    }
  }, []);

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.ash,
          tabBarStyle: { backgroundColor: colors.obsidian, borderTopColor: colors.ivory },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICON[route.name] || 'ellipse'} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Progress" component={ProgressScreen} />
        <Tab.Screen name="Workout" component={WorkoutScreen} />
        <Tab.Screen name="Exercises" component={ExercisesScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
