import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';
import Onboarding from '../onboarding/Onboarding.jsx';
import Tour from '../tour/Tour.jsx';
import CoachMark from '../coach/CoachMark.jsx';
import UiHost from '../ui/UiHost.jsx';
import { useRPG } from '../../hooks/useRPG.js';
import { useOnOpenReminders } from '../../hooks/useOnOpenReminders.js';
import useSettingsStore from '../../store/settingsStore.js';

export default function AppLayout() {
  // Ensures user profile exists in DB on first run.
  const { loaded } = useRPG();
  const onboarded = useSettingsStore((s) => s.onboarded);
  const tourSeen = useSettingsStore((s) => s.tourSeen);
  useOnOpenReminders();

  return (
    <div
      className="min-h-full"
      style={{
        // Transparent so the body's fixed aurora shows through — the light
        // source stays anchored to the viewport instead of scrolling away.
        background: 'transparent',
        // Clear the status bar / notch on edge-to-edge devices (Android 15+,
        // iOS notch). Zero on platforms that don't report insets.
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <main className="mx-auto w-full max-w-md pb-24">
        <Outlet />
      </main>
      <BottomNav />
      {loaded && !onboarded && <Onboarding />}
      {loaded && onboarded && !tourSeen && <Tour />}
      {loaded && onboarded && tourSeen && <CoachMark />}
      <UiHost />
    </div>
  );
}
