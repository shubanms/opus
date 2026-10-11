// Rest between sets, kept as a deadline rather than a countdown.
//
// The old timer counted interval ticks: `remaining - 1` once a second. A
// locked phone freezes timers, so two minutes in a pocket came back as "1:24
// left" — the rest stretched by however long the screen was off. It also lived
// in the workout page's state, so stepping over to another tab lost it, and a
// flag nobody reset showed a stray countdown at the start of the next session.
//
// Now the session stores `{ startedAt, endsAt, duration }` and everything on
// screen is computed from the clock, on every tick and on every return to the
// app. Pure + unit-tested.

import { suggestRest } from './effort.js';

export const REST_PRESETS = [60, 90, 120, 180];
const MIN_REST = 5;
/** Past this, a rest that ended while the phone was locked ends quietly. */
export const LATE_CUE_MS = 5000;

const clampSecs = (secs) => Math.max(MIN_REST, Math.round(Number(secs) || 0));

/** A fresh rest of `duration` seconds, starting now. */
export function startRest(duration, now = Date.now()) {
  const d = clampSecs(duration);
  return { startedAt: now, endsAt: now + d * 1000, duration: d };
}

/** Whole seconds left, rounded up so "0" only shows once it is really over. */
export function restRemaining(rest, now = Date.now()) {
  if (!rest?.endsAt) return 0;
  return Math.max(0, Math.ceil((rest.endsAt - now) / 1000));
}

/** Share of the rest still to go, 1 → 0, for the ring. */
export function restProgress(rest, now = Date.now()) {
  if (!rest?.endsAt || !(rest.duration > 0)) return 0;
  return Math.max(0, Math.min(1, (rest.endsAt - now) / (rest.duration * 1000)));
}

/**
 * ±15 s. The deadline and the total move together so the ring keeps its
 * proportions; cutting below zero just ends the rest.
 */
export function adjustRest(rest, deltaSecs, now = Date.now()) {
  if (!rest) return rest;
  return {
    ...rest,
    endsAt: Math.max(now, rest.endsAt + deltaSecs * 1000),
    duration: clampSecs(rest.duration + deltaSecs),
  };
}

/**
 * Change the length of a rest already running, keeping the time already
 * rested. The effort rating arrives *after* the clock starts — you log the
 * set, then say how it felt — and restarting would throw those seconds away.
 */
export function retargetRest(rest, duration, now = Date.now()) {
  if (!rest) return rest;
  const d = clampSecs(duration);
  const start = rest.startedAt ?? rest.endsAt - rest.duration * 1000;
  return { ...rest, startedAt: start, duration: d, endsAt: Math.max(now, start + d * 1000) };
}

/**
 * How long to rest after a set: the routine's own rest for that exercise when
 * it has one, else what the effort rating suggests, else your default.
 */
export function restDurationFor({ targetRest = null, rpe = null, defaultSecs = 90 } = {}) {
  if (Number(targetRest) > 0) return Math.round(Number(targetRest));
  const base = Number(defaultSecs) > 0 ? Number(defaultSecs) : 90;
  if (Number(rpe) > 0) return suggestRest(rpe, base);
  return Math.round(base);
}

/**
 * What to do about a rest that has run out.
 *
 * 'cue' — it just ended: one chime, one buzz. 'quiet' — it ended a while ago
 * (the phone was locked, the app was closed): clear it without a sound that
 * would arrive minutes late and mean nothing. null — still running, or this
 * deadline has already been handled.
 */
export function restOutcome(rest, now = Date.now(), handledEndsAt = null) {
  if (!rest?.endsAt || now < rest.endsAt) return null;
  if (handledEndsAt === rest.endsAt) return null;
  return now - rest.endsAt <= LATE_CUE_MS ? 'cue' : 'quiet';
}

/** "1:30", "45s". */
export function formatRest(secs) {
  const s = Math.max(0, Math.round(Number(secs) || 0));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
}

/** "1:00" / "1:30" for a preset chip. */
export function presetLabel(secs) {
  const s = Math.max(0, Math.round(Number(secs) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
