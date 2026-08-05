import { Swords } from 'lucide-react';
import Stage, { AccentNumber, Eyebrow } from './Stage.jsx';
import CountUp from '../fx/CountUp.jsx';
import { m, SPRING, TWEEN } from '../../motion/index.jsx';

// Clearing the Daily Dungeon. Previously a toast and a one-second particle
// burst — the same feedback as any other save, for the one thing in the app
// that can only be done once a day.

export default function DungeonCinematic({ name, iron = 0, xpBonus = 0, scale = 1 }) {
  return (
    <Stage chime="quest" haptic="pr" particles={26} label={`Dungeon cleared: ${name}`}>
      <Eyebrow>
        <span className="inline-flex items-center gap-1.5">
          <Swords size={13} /> Dungeon cleared
        </span>
      </Eyebrow>

      <m.p
        className="mt-3 font-display text-3xl font-bold"
        style={{ color: 'var(--color-text-inverse)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...TWEEN.enter, delay: 0.1 * scale }}
      >
        {name}
      </m.p>

      {iron > 0 && (
        <m.div
          className="mt-7 flex items-center justify-center gap-3"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...SPRING.pop, delay: 0.2 * scale }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 22,
              height: 22,
              transform: 'rotate(45deg)',
              background: 'var(--grad-accent)',
              borderRadius: 4,
            }}
          />
          <AccentNumber size={64}>
            <CountUp value={iron} duration={0.8 * scale} />
          </AccentNumber>
          <span className="font-mono text-xl" style={{ color: 'var(--color-ash)' }}>
            Iron
          </span>
        </m.div>
      )}

      {xpBonus > 0 && (
        <m.p
          className="mt-6 rounded-full px-4 py-1.5 font-sans text-xs font-semibold"
          style={{ background: 'var(--accent-wash)', color: 'var(--color-gold)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...TWEEN.standard, delay: 0.85 * scale }}
        >
          +{xpBonus} bonus XP from affixes
        </m.p>
      )}
    </Stage>
  );
}
