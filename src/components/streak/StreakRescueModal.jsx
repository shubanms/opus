import Modal from '../ui/Modal.jsx';
import { InkButton } from '../ink/index.js';
import useInkMotion from '../ink/useInkMotion.js';
import '../../styles/ink-system.css';
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

// `onLater` is every way of closing the sheet (X, scrim, drag, Esc, Back): not
// now. `onDecline` is only the "Let it go" button: not this lapse, ever.
export default function StreakRescueModal({ offer, tokens, onRescue, onLater, onDecline }) {
  const haptic = useHaptics();
  const motionOn = useInkMotion();
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
    <Modal isOpen onClose={onLater ?? onDecline} title="Your streak ended">
      <div className="mb-5">
        {/* Kintsugi: the streak line is broken; a gold-leaf seam mends the crack. */}
        <svg className={`sy-kin${motionOn ? '' : ' sy-kin--still'}`} viewBox="0 0 280 76" aria-hidden="true">
          <g filter="url(#ink-brush-fine)" fill="var(--washi-2)">
            <polygon points="8,30 124,30 118,38 128,44 120,52 8,52" />
            <polygon points="156,30 272,30 272,52 150,52 158,45 148,37" />
          </g>
          <g fill="none" stroke="var(--gold-leaf)" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 141 22 L 133 33 L 143 41 L 135 49 L 141 60" pathLength="100" strokeWidth="3" className="sy-kin__seam" />
            <path d="M 124 30 L 118 38 L 128 44 L 120 52" strokeWidth="1" opacity="0.7" />
            <path d="M 156 30 L 148 37 L 158 45 L 150 52" strokeWidth="1" opacity="0.7" />
          </g>
        </svg>
        <p className="sy-lost">
          {lost} {noun}s
        </p>
        <p className="mt-1 text-center font-sans text-sm" style={{ color: 'var(--mute-2)' }}>
          {missed === 1 ? `You missed a ${noun}.` : `You missed ${missed} ${noun}s.`} That run is over
          unless you spend {cost === 1 ? 'a rest token' : `${cost} rest tokens`}.
        </p>
      </div>

      {/* What a token is, said once, at the moment it matters. */}
      <div className="sy-note mb-5">
        <p>
          Rest tokens come from training — one for every 10 sessions and every 3 quests you
          finish. You have <strong>{tokens}</strong>.
          {scheduled
            ? ' Spending them here buys back the sessions you missed — the next one on your plan is still yours to hit.'
            : ' Spending them here keeps the streak alive, but only up to today: you still have to train today.'}
        </p>
      </div>

      <div className="sy-btnrow">
        <InkButton variant="secondary" onClick={onDecline}>Let it go</InkButton>
        <InkButton onClick={rescue} disabled={!affordable}>
          {affordable ? `Spend ${cost}` : `Need ${cost - tokens} more`}
        </InkButton>
      </div>
      {!affordable && (
        <p className="sy-hint">Not enough tokens this time — but now you know what they are for.</p>
      )}
      {affordable && onLater && (
        <p className="sy-hint">Not sure yet? Close this and it will ask again next time you open OPUS.</p>
      )}
    </Modal>
  );
}
