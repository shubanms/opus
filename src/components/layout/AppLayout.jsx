import { Outlet, useLocation } from 'react-router-dom';
import { m, pageVariants } from '../../motion/index.jsx';
import BottomNav from './BottomNav.jsx';
import Onboarding from '../onboarding/Onboarding.jsx';
import Tour from '../tour/Tour.jsx';
import CoachMark from '../coach/CoachMark.jsx';
import UiHost from '../ui/UiHost.jsx';
import AuroraBackdrop from '../fx/AuroraBackdrop.jsx';
import { useRPG } from '../../hooks/useRPG.js';
import { useOnOpenReminders } from '../../hooks/useOnOpenReminders.js';
import useSettingsStore from '../../store/settingsStore.js';

export default function AppLayout() {
  // Ensures user profile exists in DB on first run.
  const { loaded } = useRPG();
  const onboarded = useSettingsStore((s) => s.onboarded);
  const tourSeen = useSettingsStore((s) => s.tourSeen);
  const { pathname } = useLocation();
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
      {/*
        Route transition. Keyed on pathname so each route mounts fresh and
        animates in.

        Deliberately enter-only — no AnimatePresence exit. An exit animation
        keeps the outgoing page mounted while the new one arrives, which on a
        tabbed app means two copies of the same landmark in the DOM mid-swap:
        bad for assistive tech, and a source of ambiguous-locator flake in the
        E2E suite. Leaving instantly and arriving smoothly reads as fast.
      */}
      {/* Clear the nav properly. A fixed pb-24 ignored the safe-area inset, so
          on a gesture-nav phone the last card sat under the bar. */}
      <main
        className="mx-auto w-full max-w-md"
        style={{ paddingBottom: 'calc(104px + env(safe-area-inset-bottom))' }}
      >
        <m.div key={pathname} variants={pageVariants} initial="initial" animate="animate">
          <Outlet />
        </m.div>
      </main>
      <AuroraBackdrop />
      <BottomNav />
      {loaded && !onboarded && <Onboarding />}
      {loaded && onboarded && !tourSeen && <Tour />}
      {loaded && onboarded && tourSeen && <CoachMark />}
      <UiHost />
    </div>
  );
}
