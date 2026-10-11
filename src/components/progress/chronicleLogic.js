// Pure helpers for The Chronicle (HANDOFF 9.6). No React, no clock.

import { muscleFamily } from '../../utils/kanji.js';

/** The six recovery families, in display order. */
export const FAMILIES = [
  { kanji: '胸', name: 'Chest' },
  { kanji: '肩', name: 'Shoulders' },
  { kanji: '腕', name: 'Arms' },
  { kanji: '背', name: 'Back' },
  { kanji: '脚', name: 'Legs' },
  { kanji: '腹', name: 'Core' },
];

/** Days since the family was last trained (the freshest muscle in it), or null. */
export function familyDays(byMuscle) {
  const out = {};
  for (const f of FAMILIES) out[f.kanji] = null;
  for (const [muscle, info] of Object.entries(byMuscle ?? {})) {
    const k = muscleFamily[muscle];
    if (!(k in out) || info?.daysSince == null) continue;
    out[k] = out[k] == null ? info.daysSince : Math.min(out[k], info.daysSince);
  }
  return out;
}

/** 0..1: how much of the family is still recovering. */
export function recoveryNeed(days) {
  if (days == null || days >= 3) return 0;
  return [1, 0.72, 0.45][Math.max(0, days)];
}

export function recoveryWord(days) {
  if (days == null || days >= 4) return 'fresh';
  if (days === 0) return 'today';
  if (days === 3) return 'warming';
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** The coach line under the recovery grid. Calm, never guilt. */
export function coachLine(days) {
  const d = (k) => days?.[k];
  const hot = (k) => d(k) != null && d(k) <= 1;
  const any = Object.values(days ?? {}).some((v) => v != null);
  if (!any) return 'Nothing is spoken for yet. Any form will do.';
  if (hot('胸') || hot('肩')) {
    return hot('背') || hot('脚')
      ? 'The body is well worked. Rest, or a light walk, would serve.'
      : 'Push is spent. Pull or legs would be wiser tomorrow.';
  }
  if (hot('背') || hot('腕')) return 'Pull is spent. Push or legs would be wiser tomorrow.';
  if (hot('脚')) return 'Legs are spent. Push or pull would carry the day.';
  return 'Everything is rested. Choose your form.';
}

/** ISO week number of a YYYY-MM-DD key (local calendar). */
export function isoWeek(key) {
  const [y, mo, da] = String(key).split('-').map(Number);
  if (!y) return null;
  const t = Date.UTC(y, mo - 1, da);
  const day = new Date(t).getUTCDay() || 7;
  const thursday = t + (4 - day) * 86400000;
  const yearStart = Date.UTC(new Date(thursday).getUTCFullYear(), 0, 1);
  return Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
}

/** Labels W34… with NOW on the newest week. */
export function weekLabels(weeks) {
  return weeks.map((w, i) => (i === weeks.length - 1 ? 'NOW' : `W${isoWeek(w.week) ?? ''}`));
}

/** Headline for the volume card: newest week against the one before, and whether it's the best yet. */
export function volumeSummary(weeks) {
  const cur = weeks[weeks.length - 1]?.volume ?? 0;
  const prev = weeks[weeks.length - 2]?.volume ?? 0;
  const pct = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
  const best = cur > 0 && weeks.slice(0, -1).every((w) => w.volume < cur);
  return { cur, pct, best };
}
