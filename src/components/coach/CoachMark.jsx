import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
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
      <div
        className="anim-fade-slide-up pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-gold)' }}
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--color-gold)' }}>
          <Lightbulb size={16} style={{ color: 'var(--color-obsidian)' }} />
        </div>
        <p className="flex-1 font-sans text-xs leading-relaxed" style={{ color: 'var(--color-text-inverse)' }}>{tip}</p>
        <button
          onClick={() => markSeen(pathname)}
          className="flex-shrink-0 rounded-lg px-3 py-1.5 font-sans text-[11px] font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
}
