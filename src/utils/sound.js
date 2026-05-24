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
const A3 = 220.0, C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.0;
const A4 = 440.0, C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.0, B5 = 987.77;
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
  // Subtle tick when a set is logged (frequent → very quiet/short).
  tick(t) {
    note(A5, t, 0.05, { type: 'sine', peak: 0.06, release: 0.1 });
  },
  // Light confirming pop for adds / toggles.
  tap(t) {
    note(D5, t, 0.06, { type: 'sine', peak: 0.07, release: 0.12 });
  },
  // Rising kickoff when a workout starts.
  start(t) {
    note(C5, t, 0.1, { peak: 0.1 });
    note(G5, t + 0.08, 0.2, { peak: 0.12 });
  },
  // Soft descending "removed" cue for deletions (not harsh).
  delete(t) {
    note(A4, t, 0.12, { type: 'triangle', peak: 0.1 });
    note(E4, t + 0.1, 0.3, { type: 'triangle', peak: 0.1, release: 0.4 });
  },
  // Bright ~1s celebration when a daily goal (steps/water) is reached.
  goal(t) {
    [C5, E5, G5].forEach((f, i) => note(f, t + i * 0.08, 0.2, { peak: 0.11 }));
    note(C6, t + 0.24, 0.5, { peak: 0.1, type: 'sine', release: 0.5 });
    note(E6, t + 0.3, 0.45, { peak: 0.06, type: 'sine', release: 0.5 });
  },
  // ~5s "calling you back" anthem: a yearning minor build resolving to major.
  // i (Am) → VI (F) → VII (G) → I (C), slow and swelling.
  anthem(t) {
    const chord = (root, notes, at, dur) => {
      notes.forEach((f) => note(f, at, dur, { type: 'triangle', peak: 0.06, attack: 0.08, release: 0.7 }));
    };
    note(A3, t, 4.8, { type: 'sine', peak: 0.05, attack: 0.3, release: 1 }); // sustained low call
    chord('Am', [A4, C5, E5], t + 0.1, 1.5);
    chord('F', [F4, A4, C6], t + 1.7, 1.5);
    chord('G', [G4, B5, D5], t + 3.0, 1.0);
    chord('C', [C5, E5, G5, C6], t + 4.0, 1.6); // resolve — "come home"
  },
};

// Plays a layered cue (only when the sound pref is on; `force` previews it anyway).
export function playChime(kind = 'success', { force = false } = {}) {
  if (!force && !useSettingsStore.getState().sound) return;
  try {
    if (!ensureCtx()) return;
    (CUES[kind] ?? CUES.success)(ctx.currentTime + 0.02);
  } catch {
    /* audio unavailable */
  }
}
