import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { DMSans_300Light, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { colors, fonts } from './theme';
import { initDb } from './native/db';
import { loadSettings } from './native/settings';
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
    text: colors.textInverse,
    border: '#221F1C',
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

function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.gold} />
    </View>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({
    CormorantGaramond_700Bold,
    CormorantGaramond_600SemiBold,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  useEffect(() => {
    try {
      initDb();
      loadSettings();
    } catch (e) {
      console.warn('init failed', e);
    }
    setReady(true);
  }, []);

  if (!fontsLoaded || !ready) return <Splash />;

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.ash,
          tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 10 },
          tabBarStyle: { backgroundColor: colors.obsidian, borderTopColor: '#221F1C', height: 60, paddingBottom: 8, paddingTop: 6 },
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
