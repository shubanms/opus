// What finishing a session does to the streak, the level and the routine — the
// arithmetic `completeWorkout` used to do inline, where three of its rules had
// quietly gone wrong. Pure + unit-tested; the store does the reading and
// writing.

import { effectiveLastDate } from './streak.js';
import { shiftKey } from './dateKey.js';
import { STREAK_BONUS_PER_DAY, getLevelFromTotalXP, getTitle } from './rpg.js';
import { cappedLevel } from './bosses.js';

/**
 * The day-streak after a session that started on `startDay`.
 *
 * - **A paid rescue counts.** The streak used to be extended only when the
 *   last workout was literally yesterday, so a lapse bought back with rest
 *   tokens was wiped by the very next session. `effectiveLastDate` is the date
 *   the tokens bought through.
 * - **Yesterday is a calendar step, not 24 hours.** `now − 86 400 000` lands
 *   on the wrong day across a clock change.
 * - **The bonus is paid once a day.** Every extra session on the same day
 *   re-paid `streak × 10` XP — finishing three short sessions was a farm.
 *   `firstOfDay` is whether any other finished session is already dated
 *   `startDay`.
 * - A session dated before the last workout on record (a clock that went
 *   backwards) never rewinds anything.
 */
export function streakAfterSession(profile, startDay, { firstOfDay = true } = {}) {
  const stored = Math.max(0, Math.trunc(Number(profile?.streak) || 0));
  const last = profile?.lastWorkoutDate ?? null;

  if (last && startDay <= last) {
    return { streak: stored, lastWorkoutDate: last, changed: false, bonus: 0 };
  }

  const effective = effectiveLastDate(profile);
  let streak;
  if (effective && effective >= startDay) streak = Math.max(1, stored);
  else if (effective && effective === shiftKey(startDay, -1)) streak = stored + 1;
  else streak = 1;

  return {
    streak,
    lastWorkoutDate: startDay,
    changed: true,
    bonus: firstOfDay ? streak * STREAK_BONUS_PER_DAY : 0,
  };
}

/**
 * Whether the session earned a level-up worth celebrating.
 *
 * Decided on the XP *after* achievements have paid out — a badge's XP can be
 * the thing that tips you over, and that level-up was never celebrated. And
 * decided on the level you are actually shown: XP keeps accruing behind an
 * uncleared boss gate, but the level is sealed there, so "Level 11!" over a
 * profile that still reads Lv 10 was a celebration of nothing. Clearing a boss
 * in this very session does unseal the levels behind it, and that *is* a
 * level-up.
 *
 * Stats unknown (the lookup failed) is treated as "cannot tell" — no fanfare
 * rather than a possibly false one.
 */
export function levelUpDecision({ beforeXp = 0, afterXp = 0, statsBefore = null, statsAfter = null } = {}) {
  const rawBefore = getLevelFromTotalXP(beforeXp);
  const rawAfter = getLevelFromTotalXP(afterXp);
  if (!statsBefore || !statsAfter) {
    return { leveledUp: false, level: rawAfter, title: getTitle(rawAfter), sealed: false };
  }
  const before = cappedLevel(rawBefore, statsBefore);
  const after = cappedLevel(rawAfter, statsAfter);
  return { leveledUp: after > before, level: after, title: getTitle(after), sealed: after < rawAfter };
}

const lifts = (n) => `${n} lift${n === 1 ? '' : 's'}`;

/**
 * The toast after a routine's targets move. Worded from what actually
 * happened to each lift: a deload is the routine taking weight *off*, and
 * announcing it as "progressed" read as a reward for missing the target.
 */
export function progressionMessage(prog) {
  if (!prog) return null;
  const bumps = prog.bumps ?? [];
  const raised = Number.isFinite(prog.raised) ? prog.raised : bumps.filter((b) => b.action === 'increase').length;
  const deloaded = Number.isFinite(prog.deloaded) ? prog.deloaded : bumps.filter((b) => b.action === 'deload').length;
  if (raised && deloaded) {
    return { text: `Routine updated: ${lifts(raised)} up, ${lifts(deloaded)} deloaded`, tone: 'success' };
  }
  if (deloaded) {
    const verb = deloaded === 1 ? 'drops back next time, then builds' : 'drop back next time, then build';
    return { text: `Deload: ${lifts(deloaded)} ${verb} again`, tone: 'info' };
  }
  if (raised) {
    return { text: `Routine progressed: next targets raised for ${lifts(raised)}`, tone: 'success' };
  }
  const count = prog.count ?? bumps.length;
  return count ? { text: `Routine updated: next targets set for ${lifts(count)}`, tone: 'success' } : null;
}
