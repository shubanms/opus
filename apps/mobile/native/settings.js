// Persisted user settings (sound / effects / notification prefs), mirroring the
// PWA's settingsStore. Backed by the SQLite `settings` table. Exposes both a
// React hook (useSettings) for UI and an imperative getter (getSetting) so the
// sound/haptics helpers can gate themselves without a component.
import { useEffect, useState, useCallback } from 'react';
import { AccessibilityInfo } from 'react-native';
import { getAllSettings, setSetting as dbSetSetting } from './db';

const DEFAULTS = {
  sound: true,
  effects: true, // animations + haptics
  notifDaily: true,
  notifPR: true,
  name: 'Athlete',
  restDuration: 90, // seconds — remembered rest-timer preset
  barWeight: 20, // kg — Olympic barbell (used by the plate calculator)
};

// In-memory cache kept in sync with the DB, readable imperatively.
let cache = { ...DEFAULTS };
let loaded = false;
const listeners = new Set();
let reduceMotion = false;

function coerce(key, raw) {
  const def = DEFAULTS[key];
  if (typeof def === 'boolean') return raw === 'true' || raw === true;
  if (typeof def === 'number') return Number(raw);
  return raw;
}

export function loadSettings() {
  try {
    const rows = getAllSettings();
    const next = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) {
      if (rows[k] != null) next[k] = coerce(k, rows[k]);
    }
    cache = next;
  } catch {
    cache = { ...DEFAULTS };
  }
  loaded = true;
  AccessibilityInfo.isReduceMotionEnabled?.().then((v) => {
    reduceMotion = !!v;
    emit();
  }).catch(() => {});
  emit();
  return cache;
}

function emit() {
  for (const l of listeners) l(cache);
}

// Imperative read — used by sound.js / haptics.js and animation gating.
export function getSetting(key) {
  if (!loaded) loadSettings();
  return cache[key];
}

// Motion is on only when effects are enabled AND the OS isn't in reduce-motion.
export function motionOn() {
  return !!getSetting('effects') && !reduceMotion;
}

export function setSetting(key, value) {
  cache = { ...cache, [key]: value };
  try {
    dbSetSetting(key, value);
  } catch {}
  emit();
}

// React hook: re-renders on any settings change.
export function useSettings() {
  const [state, setState] = useState(() => {
    if (!loaded) loadSettings();
    return cache;
  });
  useEffect(() => {
    const l = (s) => setState(s);
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);
  const update = useCallback((key, value) => setSetting(key, value), []);
  return { settings: state, update, reduceMotion };
}
