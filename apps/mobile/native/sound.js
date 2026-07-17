// Sound cues (expo-av), gated by the `sound` setting. Ports the PWA's
// utils/sound.js cue vocabulary. Web Audio isn't available natively, so we play
// small pre-rendered WAV assets instead of synthesizing tones at runtime.
import { Audio } from 'expo-av';
import { getSetting } from './settings';

const FILES = {
  tick: require('../assets/sound/tick.wav'),
  tap: require('../assets/sound/tap.wav'),
  start: require('../assets/sound/start.wav'),
  success: require('../assets/sound/success.wav'),
  chime: require('../assets/sound/chime.wav'),
  delete: require('../assets/sound/delete.wav'),
  goal: require('../assets/sound/goal.wav'),
  level: require('../assets/sound/level.wav'),
  // Dedicated milestone cues (Phase G) — rendered from the web synth so the
  // native app no longer collapses these onto the general chime/success/goal.
  pr: require('../assets/sound/pr.wav'),
  achievement: require('../assets/sound/achievement.wav'),
  quest: require('../assets/sound/quest.wav'),
  rest: require('../assets/sound/rest.wav'),
  anthem: require('../assets/sound/anthem.wav'), // "calling you back" streak-risk motif
  themeOpen: require('../assets/sound/themeOpen.wav'), // ~10s cold-start intro
};

let audioConfigured = false;
async function ensureAudioMode() {
  if (audioConfigured) return;
  audioConfigured = true;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch {}
}

// Fire-and-forget: load a fresh Sound, play it, unload when it finishes so we
// never leak handles. Overlapping cues each get their own instance.
export async function playCue(name, { force = false } = {}) {
  if (!force && !getSetting('sound')) return;
  const mod = FILES[name];
  if (!mod) return;
  try {
    await ensureAudioMode();
    const { sound } = await Audio.Sound.createAsync(mod, { shouldPlay: true, volume: 1.0 });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status?.didJustFinish) sound.unloadAsync().catch(() => {});
    });
  } catch {
    // Audio is best-effort; never surface an error into the UI.
  }
}

// Settings "Preview sounds": play a short pleasant sequence regardless of gate.
export async function previewSounds() {
  const seq = ['tap', 'tick', 'start', 'success', 'level'];
  for (const c of seq) {
    // eslint-disable-next-line no-await-in-loop
    await playCue(c, { force: true });
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 260));
  }
}

// Cinematic ~10s app-open intro — fires once per cold start, gated by the
// `sound` + `themeOnOpen` settings (mirrors the web LoadingPage playIntro()).
let introPlayed = false;
export function playIntro() {
  if (introPlayed) return;
  if (!getSetting('sound') || !getSetting('themeOnOpen')) return;
  introPlayed = true;
  playCue('themeOpen');
}
