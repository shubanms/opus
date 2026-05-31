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
const C3 = 130.81, G3 = 196.0;

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
  // ~8.5s cinematic app-open intro — sustained dark / minor throughout
  // (no major lift, à la Type Shit). Sub-bass slide → brooding Am orchestral
  // hit → dark choir pad sustained underneath the whole piece → tense bell
  // descent → low building rumble → Dm (iv) brooding swell → Phrygian bell
  // motif (E-F-E-A) → 808-style slide down (V → i) → impact Am stab on the
  // drop → sustained Am octave-stack with sub-A drone → A-minor bell shimmer.
  // Stays in A-minor end to end. Plays on cold start (gated by sound + themeOnOpen).
  themeOpen(t) {
    // Sub-bass slide (cinematic horn opener) — detuned saws through a low LPF.
    const slide = (f1, f2, t0, dur, peak = 0.18) => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      filter.Q.value = 1.2;
      const g = ctx.createGain();
      const end = t0 + dur + 0.4;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.06);
      g.gain.exponentialRampToValueAtTime(peak * 0.35, t0 + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      filter.connect(g); g.connect(master);
      for (const dt of [0, 5, -5]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.detune.value = dt;
        osc.frequency.setValueAtTime(f1, t0);
        osc.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
        osc.connect(filter);
        osc.start(t0); osc.stop(end);
      }
    };

    // 1. Sub-bass slide up.
    slide(45, 110, t, 0.7, 0.2);
    // 2. Brassy Am stab on the downbeat (octaves + power).
    [55, 110, 164.8, 220, 261.6].forEach((f) =>
      note(f, t + 0.32, 0.45, { type: 'sawtooth', peak: 0.09, attack: 0.005, release: 0.55, detune: 12 })
    );
    // 3. Dark choir pad sustained through the whole piece — locks the mood.
    [A3, C4, E4, A4].forEach((f) =>
      note(f, t + 0.5, 6.5, { type: 'triangle', peak: 0.06, attack: 0.4, release: 1.4, detune: 18 })
    );
    // 4. Tense bell descent (A→E→C→A in upper octave).
    [A5, E5, C5, A4].forEach((f, i) =>
      note(f, t + 1.5 + i * 0.2, 0.55, { type: 'sine', peak: 0.08, attack: 0.005, release: 0.7 })
    );
    // 5. Building low rumble before the lift.
    note(55, t + 2.6, 1.4, { type: 'sawtooth', peak: 0.08, attack: 0.45, release: 0.45 });
    note(82.4, t + 2.6, 1.4, { type: 'sawtooth', peak: 0.06, attack: 0.45, release: 0.45 });
    // 6. Dm (iv) brooding swell — keeps minor; the only chord change is to
    //    another minor, so the mood never brightens.
    [D4, F4, A4].forEach((f) =>
      note(f, t + 4.0, 1.1, { type: 'triangle', peak: 0.09, attack: 0.15, release: 0.85, detune: 14 })
    );
    // 7. Tense bell motif in E Phrygian (E → F → E → A) — the minor 2nd
    //    is the darkest possible interval; reads "menacing", not heroic.
    [E5, F5, E5, A5].forEach((f, i) =>
      note(f, t + 4.6 + i * 0.14, 0.5, { type: 'sine', peak: 0.1, attack: 0.005, release: 0.6 })
    );
    // 8. 808-style sub-bass slide DOWN (E2 → A1, V → i) — trap-style drop.
    slide(82.4, 55, t + 5.3, 0.55, 0.2);
    // 9. Impact stab on the drop — Am, mirrors the opening hit.
    [55, 110, 164.8, 220, 329.6].forEach((f) =>
      note(f, t + 5.85, 0.5, { type: 'sawtooth', peak: 0.1, attack: 0.005, release: 0.6, detune: 12 })
    );
    // 10. Final sustained Am chord — octave-stacked low-to-high. Stays
    //     minor; no "sunshine and rainbows" major lift.
    [55, 82.4, 110, A3, C4, E4, A4, C5, E5].forEach((f) =>
      note(f, t + 5.9, 2.3, { type: 'triangle', peak: 0.07, attack: 0.08, release: 1.7, detune: 10 })
    );
    // 11. Sub-A drone underneath for weight.
    note(55, t + 5.9, 2.5, { type: 'sawtooth', peak: 0.08, attack: 0.06, release: 1.4 });
    // 12. Bell shimmer in A-minor pentatonic (A, C, E) — keeps the colour dark.
    [A5, C6, E6].forEach((f, i) =>
      note(f, t + 6.4 + i * 0.2, 0.7, { type: 'sine', peak: 0.06, release: 1.0 })
    );
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

// Cinematic intro — fires once per cold start. Tries immediately (installed
// PWAs allow autoplay), and on a browser tab where autoplay is blocked, defers
// to the first user gesture so it kicks in when they tap. Gated by the sound
// preference at call sites.
let introPlayed = false;
export function playIntro() {
  if (introPlayed) return;
  const tryGo = () => {
    if (introPlayed) return true;
    try {
      const c = ensureCtx();
      if (!c || c.state !== 'running') return false;
      introPlayed = true;
      CUES.themeOpen(c.currentTime + 0.02);
      return true;
    } catch { return false; }
  };
  if (tryGo()) return;
  const onGesture = () => { tryGo(); };
  document.addEventListener('pointerdown', onGesture, { once: true, passive: true });
}

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
