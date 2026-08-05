import { createPortal } from 'react-dom';
import { Award } from 'lucide-react';
import { m, SPRING, listVariants } from '../../motion/index.jsx';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import { useEffect } from 'react';

// Achievements stay a card stack near the thumb rather than taking the whole
// screen. They are the secondary register: several can land at once, and a
// full-screen takeover per badge would bury the record or level that earned
// them. Queued behind the big moments so they no longer land on top of one.

export default function AchievementCinematic({ achievements = [] }) {
  const haptic = useHaptics();

  // biome-ignore lint/correctness/useExhaustiveDependencies: fires once, on mount
  useEffect(() => {
    haptic('success');
    playChime('achievement');
  }, []);

  return createPortal(
    <m.div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-28 z-[84] flex flex-col items-center px-5"
      variants={listVariants}
      initial="initial"
      animate="animate"
      exit={{ opacity: 0, y: 12 }}
    >
      {achievements.map((a) => (
        <m.div
          key={a.key}
          className="glass glass-strong mb-2 flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3"
          style={{ border: '1px solid var(--color-gold)', boxShadow: 'var(--glow-accent)' }}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={SPRING.pop}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'var(--grad-accent)' }}
          >
            <Award size={20} style={{ color: 'var(--color-obsidian)' }} />
          </div>
          <div className="min-w-0 text-left">
            <p
              className="font-sans text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-gold)' }}
            >
              Achievement unlocked
            </p>
            <p
              className="truncate font-sans text-sm font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {a.title}
            </p>
          </div>
          {a.xp > 0 && (
            <span className="ml-auto font-mono text-sm" style={{ color: 'var(--color-gold)' }}>
              +{a.xp}
            </span>
          )}
        </m.div>
      ))}
    </m.div>,
    document.body
  );
}
