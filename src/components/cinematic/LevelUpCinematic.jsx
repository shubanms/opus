import Stage, { Eyebrow } from './Stage.jsx';
import OpusMark from '../logo/OpusMark.jsx';
import TitleBadge from '../rpg/TitleBadge.jsx';
import { m, SPRING, TWEEN } from '../../motion/index.jsx';

// Levelling up, rebuilt on the monogram.
//
// The old version was a bare gold numeral on black, written in CSS keyframes
// before there was a motion system. Seating the number inside the OPUS ring
// ties the biggest moment in the app to its identity — and the ring already
// knows how to thicken and add a stud per level, so it is literally the mark
// growing with you.

export default function LevelUpCinematic({ level, title, scale = 1 }) {
  return (
    <Stage chime="levelup" haptic="levelup" particles={34} label={`Level ${level}: ${title}`}>
      <Eyebrow>Level up</Eyebrow>

      <m.div
        className="relative mt-6 flex items-center justify-center"
        initial={{ scale: 0.75, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...SPRING.pop, delay: 0.1 * scale }}
      >
        <OpusMark size={190} dark animate level={level} />
        <m.span
          className="absolute font-display font-bold leading-none"
          style={{ fontSize: 76, color: 'var(--color-text-inverse)' }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRING.pop, delay: 0.45 * scale }}
        >
          {level}
        </m.span>
      </m.div>

      <m.div
        className="mt-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...TWEEN.enter, delay: 0.7 * scale }}
      >
        <TitleBadge title={title} />
      </m.div>

      <m.p
        className="mt-6 font-display text-xl italic"
        style={{ color: 'var(--color-ash)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...TWEEN.standard, delay: 1 * scale }}
      >
        Build your masterpiece.
      </m.p>
    </Stage>
  );
}
