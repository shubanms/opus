import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { KanjiTile } from '../ink/index.js';
import '../../styles/ink-system.css';
import useSettingsStore from '../../store/settingsStore.js';

// First-use tip per tab. Shows once per route (localStorage seen-state) after
// onboarding + the tour, above the bottom nav. Dismissed with "Got it".
const TIPS = {
  '/home': 'Home base — your week so far, quests, recovery map and daily rings, all at a glance.',
  '/progress': 'All your charts: volume, PRs, estimated 1RM, body metrics, and your steps & water log.',
  '/workout': 'Start or continue a session here — log sets, chain exercises into supersets, and rest between.',
  '/exercises': 'Your library — search, favorite ★, colour-code, and add coaching notes to any movement.',
  '/profile': 'Your character sheet — level & radar, trophies, Hall of Records, and shareable cards.',
};

export default function CoachMark() {
  const { pathname } = useLocation();
  const seen = useSettingsStore((s) => s.coachMarksSeen);
  const markSeen = useSettingsStore((s) => s.markCoachSeen);

  const tip = TIPS[pathname];
  if (!tip || seen?.[pathname]) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-5"
      style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}
    >
      <div className="washi sy-coach pointer-events-auto">
        <KanjiTile kanji="記" state="lit" size={32} />
        <p>{tip}</p>
        <button type="button" onClick={() => markSeen(pathname)} className="sy-coach__ok">
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
}
