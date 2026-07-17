// In-memory active-workout session — the native equivalent of the web
// workoutStore. The in-progress session (exercises → sets, supersets, targets,
// energy, notes, name) lives in memory and is only written to SQLite at finish
// (native/db.js commitWorkout). It's mirrored to the settings table on every
// change so a phone lock / app restart restores it (via @opus/core/workoutSession
// serialize/deserialize/isStale). Hand-rolled store (no zustand), matching the
// settings.js pattern: module state + listeners + a useWorkoutSession() hook.
import { useEffect, useState } from 'react';
import { workoutSession as ws, reorder } from '@opus/core';
import { getAllSettings, setSetting } from './db';

const SNAP_KEY = '_activeSession';

let session = null;
let loaded = false;
const listeners = new Set();

function emit() {
  for (const l of listeners) l(session);
}

// Write-through snapshot so a reload restores the session.
function persist() {
  try {
    if (session) setSetting(SNAP_KEY, ws.serialize(session));
    else setSetting(SNAP_KEY, '');
  } catch {
    /* ignore */
  }
}

function commitState(next) {
  session = next;
  persist();
  emit();
}

// Restore a non-stale snapshot on boot. Called from App.js alongside settings.
export function loadSession() {
  try {
    const raw = getAllSettings()[SNAP_KEY];
    const saved = ws.deserialize(raw);
    session = saved && !ws.isStale(saved) ? saved : null;
  } catch {
    session = null;
  }
  loaded = true;
  emit();
  return session;
}

export function getSession() {
  if (!loaded) loadSession();
  return session;
}

export function hasActiveSession() {
  return !!getSession();
}

// The next set number for an exercise — monotonic (survives mid-list deletions
// without key collisions).
function nextSetNumber(ex) {
  return ex.sets.reduce((m, s) => Math.max(m, s.setNumber || 0), 0) + 1;
}

function mapExercise(session, name, fn) {
  return { ...session, exercises: session.exercises.map((e) => (e.name === name ? fn(e) : e)) };
}

// ── Actions (mirror the web workoutStore) ────────────────────────────────────
export function startSession(name = 'Workout') {
  commitState({ startedAt: Date.now(), name, templateId: null, energy: null, notes: '', exercises: [] });
}

// Begin from a routine: exercises = [{ name, muscleGroup, equipment, targetSets, targetReps, targetWeight }].
export function startFromTemplate({ name = 'Workout', templateId = null, exercises = [] }) {
  commitState({
    startedAt: Date.now(),
    name,
    templateId,
    energy: null,
    notes: '',
    exercises: exercises.map((e) => ({
      name: e.name,
      muscleGroup: e.muscleGroup ?? null,
      equipment: e.equipment ?? null,
      isBodyweight: e.equipment === 'bodyweight',
      targetSets: e.targetSets ?? null,
      targetReps: e.targetReps ?? null,
      targetWeight: e.targetWeight ?? null,
      supersetId: null,
      sets: [],
    })),
  });
}

export function ensureSession() {
  if (!getSession()) startSession();
  return session;
}

export function addExercise({ name, muscleGroup = null, equipment = null }) {
  if (!name) return;
  ensureSession();
  if (session.exercises.some((e) => e.name === name)) return;
  commitState({
    ...session,
    exercises: [
      ...session.exercises,
      { name, muscleGroup, equipment, isBodyweight: equipment === 'bodyweight', targetSets: null, targetReps: null, targetWeight: null, supersetId: null, sets: [] },
    ],
  });
}

export function logSet(name, { weight = 0, reps = 0, rpe = null, isWarmup = false } = {}) {
  if (!session) return;
  commitState(mapExercise(session, name, (e) => ({
    ...e,
    sets: [...e.sets, { setNumber: nextSetNumber(e), weight: Number(weight) || 0, reps: Number(reps) || 0, rpe, isWarmup: !!isWarmup, note: null, completedAt: Date.now() }],
  })));
}

export function removeSet(name, setNumber) {
  if (!session) return;
  commitState(mapExercise(session, name, (e) => ({ ...e, sets: e.sets.filter((s) => s.setNumber !== setNumber) })));
}

export function toggleWarmup(name, setNumber) {
  if (!session) return;
  commitState(mapExercise(session, name, (e) => ({
    ...e,
    sets: e.sets.map((s) => (s.setNumber === setNumber ? { ...s, isWarmup: !s.isWarmup } : s)),
  })));
}

export function setSetNote(name, setNumber, note) {
  if (!session) return;
  commitState(mapExercise(session, name, (e) => ({
    ...e,
    sets: e.sets.map((s) => (s.setNumber === setNumber ? { ...s, note } : s)),
  })));
}

export function removeExercise(name) {
  if (!session) return;
  commitState({ ...session, exercises: session.exercises.filter((e) => e.name !== name) });
}

export function moveExercise(name, dir) {
  if (!session) return;
  const i = session.exercises.findIndex((e) => e.name === name);
  if (i < 0) return;
  const exercises = reorder.moveItem(session.exercises, i, dir);
  if (exercises === session.exercises) return;
  commitState({ ...session, exercises });
}

// Chain an exercise into a superset with the one above it (shared supersetId;
// rest is taken only after the last member). Toggling re-derives grouping.
export function toggleSuperset(name) {
  if (!session) return;
  const i = session.exercises.findIndex((e) => e.name === name);
  if (i <= 0) return;
  const cur = session.exercises[i];
  const prev = session.exercises[i - 1];
  const joined = cur.supersetId != null && cur.supersetId === prev.supersetId;
  const exercises = session.exercises.slice();
  if (joined) {
    exercises[i] = { ...cur, supersetId: null };
  } else {
    const groupId = prev.supersetId ?? Date.now();
    exercises[i - 1] = { ...prev, supersetId: groupId };
    exercises[i] = { ...cur, supersetId: groupId };
  }
  commitState({ ...session, exercises });
}

export function setEnergy(level) {
  if (session) commitState({ ...session, energy: level });
}
export function setName(name) {
  if (session) commitState({ ...session, name });
}
export function setNotes(notes) {
  if (session) commitState({ ...session, notes });
}

export function discardSession() {
  commitState(null);
}

// React hook — subscribes to session changes.
export function useWorkoutSession() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    if (!loaded) loadSession();
    return () => listeners.delete(l);
  }, []);
  return getSession();
}
