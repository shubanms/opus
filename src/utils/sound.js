import useSettingsStore from '../store/settingsStore.js';

let ctx;

const NOTES = {
  success: [784],
  pr: [659, 988],
  levelup: [523, 659, 784, 1047],
};

// Plays a short synthesized chime (only when the sound pref is on).
export function playChime(kind = 'success') {
  if (!useSettingsStore.getState().sound) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = NOTES[kind] ?? NOTES.success;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch {
    /* audio unavailable */
  }
}
