import { useRPG } from '../../hooks/useRPG.js';
import { useRestTokens } from '../../hooks/useRestTokens.js';
import { useStreak } from '../../hooks/useStreak.js';
import useSettingsStore from '../../store/settingsStore.js';
import useUserStore from '../../store/userStore.js';
import { graceFromOffer, rescueOffer } from '../../utils/streak.js';
import StreakRescueModal from './StreakRescueModal.jsx';

// Decides whether the rescue offer is on the table, app-wide.
//
// App-wide rather than on Home because a lapse should be caught wherever you
// land — deep-linked from a shortcut, resuming on Progress, anywhere. Home was
// the *only* place a token could be spent before, which is why nobody found it.
//
// Declining is remembered against the lapse itself, not "seen once": the offer
// comes back if you lapse again, but not every time you open the app during the
// same one. Nothing here is destructive, so no confirm — "let it go" is the
// safe branch and it is the one that costs nothing.

export default function StreakRescueHost() {
  const { profile, loaded } = useRPG();
  const tokens = useRestTokens();
  const streak = useStreak();
  const onboarded = useSettingsStore((s) => s.onboarded);
  const declinedFor = useSettingsStore((s) => s.rescueDeclinedFor);
  const declineRescue = useSettingsStore((s) => s.declineRescue);
  const spendShield = useSettingsStore((s) => s.spendShield);
  const updateProfile = useUserStore((s) => s.updateProfile);

  if (!loaded || !onboarded || !profile) return null;
  // The live state is passed in so a plan's rest days are not mistaken for a
  // lapse: without it, someone on Mon/Wed/Fri would be offered a rescue every
  // Wednesday for a streak their own plan says is intact.
  const offer = rescueOffer(profile, tokens, undefined, streak);
  if (!offer) return null;
  if (declinedFor && declinedFor === profile.lastWorkoutDate) return null;

  function rescue() {
    // One action, both effects. The XP shield and the streak rescue were always
    // the same token; splitting them would mean paying twice for one lapse.
    spendShield(profile.lastWorkoutDate, offer.cost);
    updateProfile(
      offer.scheduled
        ? { creditedDays: [...new Set([...(profile.creditedDays ?? []), ...offer.credited])] }
        : { streakGrace: graceFromOffer(offer) }
    );
  }

  return (
    <StreakRescueModal
      offer={offer}
      tokens={tokens}
      onRescue={rescue}
      onDecline={() => declineRescue(profile.lastWorkoutDate)}
    />
  );
}
