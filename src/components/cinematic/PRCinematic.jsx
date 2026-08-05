import Stage, { AccentNumber, Eyebrow } from './Stage.jsx';
import CountUp from '../fx/CountUp.jsx';
import { m, SPRING, TWEEN } from '../../motion/index.jsx';
import useSettingsStore from '../../store/settingsStore.js';
import { toDisplay, unitLabel } from '../../utils/units.js';

// A personal record — the moment the whole app exists to produce, and until
// now the only one with no screen of its own: it got a one-second particle
// burst and a toast.
//
// The number counts *from the record it beat*, so you watch the old figure get
// passed rather than being told about it afterwards.

const TYPE_LABEL = {
  weight: 'Heaviest set',
  reps: 'Most reps',
  volume: 'Biggest set',
};

export default function PRCinematic({ pr, extra = 0, scale = 1 }) {
  const unit = useSettingsStore((s) => s.unit);
  if (!pr) return null;

  // Records are stored in kg; reps are a count and convert to nothing.
  const isWeight = pr.type === 'weight' || pr.type === 'volume';
  const value = isWeight ? Math.round(toDisplay(pr.value, unit)) : pr.value;
  const previous = pr.prev != null && pr.prev > 0
    ? (isWeight ? Math.round(toDisplay(pr.prev, unit)) : pr.prev)
    : null;
  const suffix = pr.type === 'reps' ? 'reps' : unitLabel(unit);

  return (
    <Stage chime="pr" haptic="pr" particles={30} label={`New record: ${pr.name}`}>
      <Eyebrow>New record</Eyebrow>

      <m.p
        className="mt-3 font-display text-2xl font-bold"
        style={{ color: 'var(--color-text-inverse)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...TWEEN.enter, delay: 0.1 * scale }}
      >
        {pr.name}
      </m.p>

      <m.div
        className="mt-5 flex items-baseline justify-center gap-2"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...SPRING.pop, delay: 0.15 * scale }}
      >
        <AccentNumber>
          <CountUp value={value} from={previous ?? 0} duration={0.9 * scale} />
        </AccentNumber>
        <span className="font-mono text-2xl" style={{ color: 'var(--color-ash)' }}>
          {suffix}
        </span>
      </m.div>

      <m.p
        className="mt-4 font-sans text-sm"
        style={{ color: 'var(--color-ash)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...TWEEN.standard, delay: 0.9 * scale }}
      >
        {previous != null ? (
          <>
            beat{' '}
            <span style={{ textDecoration: 'line-through' }}>
              {previous} {suffix}
            </span>
          </>
        ) : (
          `${TYPE_LABEL[pr.type] ?? 'Record'} — your first on this lift`
        )}
      </m.p>

      {extra > 0 && (
        <m.p
          className="mt-6 rounded-full px-4 py-1.5 font-sans text-xs font-semibold"
          style={{ background: 'var(--accent-wash)', color: 'var(--color-gold)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...TWEEN.standard, delay: 1.05 * scale }}
        >
          +{extra} more record{extra > 1 ? 's' : ''} this session
        </m.p>
      )}
    </Stage>
  );
}
