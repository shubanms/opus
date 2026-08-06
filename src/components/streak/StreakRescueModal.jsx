import { Flame, Shield } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { m } from '../../motion/index.jsx';
import { playChime } from '../../utils/sound.js';
import { useHaptics } from '../../hooks/useHaptics.js';

// The lapse, caught the next time you open the app.
//
// A PWA cannot reliably wake you (see the v5 notification research), so there
// is no honest way to warn someone at 9pm that today is the deadline. What it
// *can* do is notice on the way back in, explain what happened, and offer the
// rest tokens they already earned — which is the whole reason those tokens were
// derived from history rather than sold.
//
// This is also the first time the app explains what a rest token is. They used
// to sit on Home as an unexplained "🛡️ 2 banked", which is a number, not a
// mechanic.

export default function StreakRescueModal({ offer, tokens, onRescue, onDecline }) {
  const haptic = useHaptics();
  if (!offer) return null;

  const { cost, lost, missed, affordable, scheduled } = offer;
  // On a plan the unit is a session, not a day — "you missed a day" is exactly
  // the framing schedule-aware streaks exist to stop using.
  const noun = scheduled ? 'session' : 'day';

  function rescue() {
    haptic('pr');
    playChime('goal');
    onRescue();
  }

  return (
    <Modal isOpen onClose={onDecline} title="Your streak ended">
      <div className="mb-5 flex flex-col items-center text-center">
        <m.div
          className="mb-3 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'var(--accent-wash)' }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          <Flame size={30} style={{ color: 'var(--color-ember)' }} />
        </m.div>
        <p className="font-display text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {lost} {noun}s
        </p>
        <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {missed === 1 ? `You missed a ${noun}.` : `You missed ${missed} ${noun}s.`} That run is over
          unless you spend {cost === 1 ? 'a rest token' : `${cost} rest tokens`}.
        </p>
      </div>

      {/* What a token is, said once, at the moment it matters. */}
      <div
        className="mb-5 flex items-start gap-2.5 rounded-2xl px-3.5 py-3"
        style={{ background: 'var(--color-ivory)' }}
      >
        <Shield size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--color-gold)' }} />
        <p className="font-sans text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          Rest tokens come from training — one for every 10 sessions and every 3 quests you
          finish. You have <strong style={{ color: 'var(--color-text-primary)' }}>{tokens}</strong>.
          {scheduled
            ? ' Spending them here buys back the sessions you missed — the next one on your plan is still yours to hit.'
            : ' Spending them here keeps the streak alive, but only up to today: you still have to train today.'}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onDecline}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          Let it go
        </button>
        <button
          type="button"
          onClick={rescue}
          disabled={!affordable}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-medium"
          style={{
            background: 'var(--color-gold)',
            color: 'var(--color-obsidian)',
            opacity: affordable ? 1 : 0.35,
          }}
        >
          {affordable ? `Spend ${cost}` : `Need ${cost - tokens} more`}
        </button>
      </div>
      {!affordable && (
        <p className="mt-2 text-center font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Not enough tokens this time — but now you know what they are for.
        </p>
      )}
    </Modal>
  );
}
