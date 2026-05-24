import useSettingsStore from '../store/settingsStore.js';

// A small WebAudio synth — no samples, fully offline. Each cue is a short
// sequence of layered, detuned, filtered voices with a touch of delay "space",
// so milestones feel majestic rather than like flat beeps. Gated by the sound
// preference and only ever fired from user-driven moments.

let ctx;
let master;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;

    // Light feedback delay for a sense of space.
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.13;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.24;
    const wet = ctx.createGain();
    wet.gain.value = 0.16;
    master.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    master.connect(ctx.destination);
    wet.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// One note: a fundamental plus two detuned voices through a lowpass, with a
// soft attack and exponential tail.
function note(freq, t0, dur, opts = {}) {
  const { type = 'triangle', peak = 0.16, attack = 0.012, release = 0.34, detune = 7 } = opts;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(freq * 6, 9000);
  filter.Q.value = 0.5;

  const g = ctx.createGain();
  const end = t0 + dur + release;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(peak * 0.65, t0 + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, end);

  filter.connect(g);
  g.connect(master);

  for (const [i, dt] of [0, detune, -detune].entries()) {
    const osc = ctx.createOscillator();
    osc.type = i === 0 ? type : 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = dt;
    osc.connect(filter);
    osc.start(t0);
    osc.stop(end);
  }
}

// Notes (Hz).
const C5 = 523.25, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.0, B5 = 987.77;
const C6 = 1046.5, E6 = 1318.51, G6 = 1567.98;

const CUES = {
  // Frequent + gentle.
  success(t) {
    note(G5, t, 0.18, { peak: 0.11 });
    note(C6, t + 0.04, 0.2, { peak: 0.07, type: 'sine' });
  },
  // Soft completion cue (rest timer).
  rest(t) {
    note(E5, t, 0.14, { peak: 0.1, type: 'sine' });
    note(A5, t + 0.1, 0.22, { peak: 0.1, type: 'sine' });
  },
  // Triumphant — a quick rise into a bright chord.
  pr(t) {
    note(C5, t, 0.1, { peak: 0.12 });
    note(E5, t + 0.07, 0.1, { peak: 0.12 });
    note(G5, t + 0.14, 0.45, { peak: 0.16 });
    note(C6, t + 0.14, 0.5, { peak: 0.1 });
  },
  // Sparkly cascade.
  achievement(t) {
    [C6, E6, G5, B5].forEach((f, i) => note(f, t + i * 0.075, 0.3, { type: 'sine', peak: 0.09, release: 0.4 }));
  },
  // Uplifting two-chord lift (IV → I).
  quest(t) {
    [F5, A5, C6].forEach((f) => note(f, t, 0.22, { peak: 0.09 }));
    [G5, C6, E6].forEach((f) => note(f, t + 0.2, 0.4, { peak: 0.11, release: 0.5 }));
  },
  // Grand fanfare — rising arpeggio into a sustained major chord with octave.
  levelup(t) {
    [C5, E5, G5, C6].forEach((f, i) => note(f, t + i * 0.1, 0.2, { peak: 0.12 }));
    const chord = t + 0.5;
    [C5, E5, G5, C6].forEach((f) => note(f, chord, 0.95, { peak: 0.12, release: 0.9 }));
    note(G6, chord + 0.05, 0.9, { peak: 0.07, type: 'sine', release: 0.9 });
  },
};

// Plays a layered cue (only when the sound pref is on).
export function playChime(kind = 'success') {
  if (!useSettingsStore.getState().sound) return;
  try {
    if (!ensureCtx()) return;
    (CUES[kind] ?? CUES.success)(ctx.currentTime + 0.02);
  } catch {
    /* audio unavailable */
  }
}
