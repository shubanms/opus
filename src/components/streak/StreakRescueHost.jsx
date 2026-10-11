import { useState } from 'react';
import { useRPG } from '../../hooks/useRPG.js';
import { useRestTokenBalance } from '../../hooks/useRestTokens.js';
import { useStreak } from '../../hooks/useStreak.js';
import useSettingsStore from '../../store/settingsStore.js';
import useUserStore from '../../store/userStore.js';
import { graceDays, graceFromOffer, rescueOffer } from '../../utils/streak.js';
import StreakRescueModal from './StreakRescueModal.jsx';

// Decides whether the rescue offer is on the table, app-wide.
//
// App-wide rather than on Home because a lapse should be caught wherever you
// land — deep-linked from a shortcut, resuming on Progress, anywhere. Home was
// the *only* place a token could be spent before, which is why nobody found it.
//
// Two ways to say no, and they are not the same. "Let it go" is a decision and
// is remembered against the lapse itself: the offer comes back if you lapse
// again, but not every time you open the app during this one. Closing the sheet
// — the X, the scrim, a drag, Back — is "not now", and it used to be recorded
// as the same permanent decline, so a stray tap on the scrim cost you the
// chance to save a streak. Now it only puts the offer away for this session.

const SNOOZE_KEY = 'opus_rescue_later';
// In memory as well, for the browsers where sessionStorage throws.
let snoozedFor = null;

function readSnooze() {
  try {
    return sessionStorage.getItem(SNOOZE_KEY) ?? snoozedFor;
  } catch {
    return snoozedFor;
  }
}

function writeSnooze(lapse) {
  snoozedFor = lapse;
  try {
    sessionStorage.setItem(SNOOZE_KEY, lapse);
  } catch {
    /* the in-memory copy still covers this session */
  }
}

export default function StreakRescueHost() {
  const { profile, loaded } = useRPG();
  const { tokens, ready: tokensReady } = useRestTokenBalance();
  const streak = useStreak();
  const onboarded = useSettingsStore((s) => s.onboarded);
  const declinedFor = useSettingsStore((s) => s.rescueDeclinedFor);
  const declineRescue = useSettingsStore((s) => s.declineRescue);
  const spendShield = useSettingsStore((s) => s.spendShield);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const [later, setLater] = useState(readSnooze);

  if (!loaded || !onboarded || !profile) return null;
  // Wait for the real answer. While the plan is still loading, useStreak shows
  // the day streak — which for a Mon/Wed/Fri lifter is "broken" every
  // Wednesday — and the token count reads 0, so acting early flashed an offer
  // for a streak that was fine, priced as unaffordable.
  if (!streak.ready || !tokensReady) return null;
  // The live state is passed in so a plan's rest days are not mistaken for a
  // lapse: without it, someone on Mon/Wed/Fri would be offered a rescue every
  // Wednesday for a streak their own plan says is intact.
  const offer = rescueOffer(profile, tokens, undefined, streak);
  if (!offer) return null;
  const lapse = profile.lastWorkoutDate ?? '';
  if (declinedFor && declinedFor === profile.lastWorkoutDate) return null;
  if (later === lapse) return null;

  function rescue() {
    // One action, both effects. The XP shield and the streak rescue were always
    // the same token; splitting them would mean paying twice for one lapse.
    spendShield(profile.lastWorkoutDate, offer.cost);
    if (offer.scheduled) {
      updateProfile({ creditedDays: [...new Set([...(profile.creditedDays ?? []), ...offer.credited])] });
      return;
    }
    const grace = graceFromOffer(offer);
    // The grace only lives until the next workout (it is stamped to the lapse it
    // was bought for), so the days it bridged are also kept for good: the best
    // streak must still see one run, not two, long after the grace is gone.
    updateProfile({
      streakGrace: grace,
      bridgedDays: [...new Set([...(profile.bridgedDays ?? []), ...graceDays({ streakGrace: grace })])],
    });
  }

  function putOff() {
    writeSnooze(lapse);
    setLater(lapse);
  }

  return (
    <StreakRescueModal
      offer={offer}
      tokens={tokens}
      onRescue={rescue}
      onLater={putOff}
      onDecline={() => declineRescue(profile.lastWorkoutDate)}
    />
  );
}
