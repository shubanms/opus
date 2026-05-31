import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import LoadingPage from './pages/LoadingPage.jsx';
import HomePage from './pages/HomePage.jsx';
import WorkoutPage from './pages/WorkoutPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import ExercisePage from './pages/ExercisePage.jsx';
import ExerciseDetailPage from './pages/ExerciseDetailPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import TemplatesPage from './pages/TemplatesPage.jsx';
import AchievementsPage from './pages/AchievementsPage.jsx';
import ProgressionPage from './pages/ProgressionPage.jsx';
import HallOfRecordsPage from './pages/HallOfRecordsPage.jsx';
import WrappedPage from './pages/WrappedPage.jsx';

export const router = createBrowserRouter(
  [
    { path: '/', element: <LoadingPage /> },
    {
      element: <AppLayout />,
      children: [
        { path: '/home', element: <HomePage /> },
        { path: '/workout', element: <WorkoutPage /> },
        { path: '/history', element: <HistoryPage /> },
        { path: '/templates', element: <TemplatesPage /> },
        { path: '/achievements', element: <AchievementsPage /> },
        { path: '/progression', element: <ProgressionPage /> },
        { path: '/records', element: <HallOfRecordsPage /> },
        { path: '/wrapped', element: <WrappedPage /> },
        { path: '/exercises', element: <ExercisePage /> },
        { path: '/exercises/:id', element: <ExerciseDetailPage /> },
        { path: '/progress', element: <ProgressPage /> },
        { path: '/profile', element: <ProfilePage /> },
        { path: '/settings', element: <SettingsPage /> },
      ],
    },
  ],
  // Basename mirrors Vite's BASE_URL so Capacitor's WebView (base '/') and
  // GitHub Pages ('/opus/') both match. createBrowserRouter wants the leading
  // '/' but no trailing slash; '/' alone is fine.
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' }
);
