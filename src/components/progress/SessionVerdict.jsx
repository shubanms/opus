import { Sparkles } from 'lucide-react';
import { m, TWEEN } from '../../motion/index.jsx';
import { friendlyDate } from '../../utils/dateKey.js';

// What the app made of your last session.
//
// Everything else here rewards the *act* of logging — XP, Iron, badges. This is
// the only thing that says anything about what was logged, which was the gap:
// a brilliant session and a junk session earned roughly the same points, so the
// more you fed it the more points came out and you learned nothing.
//
// Renders nothing when there is no verdict (sessions saved before this existed,
// or a failed computation), rather than a card apologising for itself.

export default function SessionVerdict({ workout }) {
  if (!workout?.verdict) return null;

  return (
    <m.div
      className="glass mb-4 rounded-2xl px-4 py-3.5"
      style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TWEEN.enter}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <Sparkles size={12} style={{ color: 'var(--color-gold)' }} />
        <span
          className="font-sans text-[10px] font-semibold uppercase"
          style={{ color: 'var(--color-gold)', letterSpacing: '0.18em' }}
        >
          Last session
        </span>
        <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--color-ash)' }}>
          {friendlyDate(workout.date)}
        </span>
      </div>
      <p className="font-sans text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
        {workout.verdict}
      </p>
    </m.div>
  );
}
