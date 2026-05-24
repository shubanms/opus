import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';
import Onboarding from '../onboarding/Onboarding.jsx';
import Tour from '../tour/Tour.jsx';
import UiHost from '../ui/UiHost.jsx';
import { useRPG } from '../../hooks/useRPG.js';
import useSettingsStore from '../../store/settingsStore.js';

export default function AppLayout() {
  // Ensures user profile exists in DB on first run.
  const { loaded } = useRPG();
  const onboarded = useSettingsStore((s) => s.onboarded);
  const tourSeen = useSettingsStore((s) => s.tourSeen);

  return (
    <div className="min-h-full" style={{ background: 'var(--color-chalk)' }}>
      <main className="mx-auto w-full max-w-md pb-24">
        <Outlet />
      </main>
      <BottomNav />
      {loaded && !onboarded && <Onboarding />}
      {loaded && onboarded && !tourSeen && <Tour />}
      <UiHost />
    </div>
  );
}
