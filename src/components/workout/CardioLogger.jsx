import { useState } from 'react';
import { Plus, Trash2, Flame } from 'lucide-react';
import useWorkoutStore from '../../store/workoutStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import { useExercise } from '../../hooks/useExercises.js';
import { useCurrentBodyweight } from '../../hooks/useProgress.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import { treadmillKcal, metKcal, distanceKm } from '../../utils/calories.js';

const KMH_PER_MPH = 1.60934;
const MI_PER_KM = 0.621371;

// Logger for cardio exercises: log a bout by time (+ speed & incline for
// treadmill-style) and it computes distance + calories. Speed/distance follow
// the user's unit setting (kg → km/h·km, lbs → mph·mi).
export default function CardioLogger({ exerciseId, onLogged }) {
  const { activeWorkout, logSet, removeSet } = useWorkoutStore();
  const unit = useSettingsStore((s) => s.unit);
  const exercise = activeWorkout?.exercises.find((e) => e.exerciseId === exerciseId);
  const meta = useExercise(exerciseId);
  const bw = useCurrentBodyweight();
  const weightKg = bw ?? 70; // fall back to a nominal weight if none logged
  const haptic = useHaptics();

  const imperial = unit === 'lbs';
  const speedUnit = imperial ? 'mph' : 'km/h';
  const mode = meta?.cardioMode ?? 'met';
  const met = meta?.met ?? 6;

  const [mins, setMins] = useState('');
  const [speed, setSpeed] = useState('');
  const [incline, setIncline] = useState('');

  if (!exercise) return null;

  const minutes = Number.parseFloat(mins) || 0;
  const speedKmh = imperial ? (Number.parseFloat(speed) || 0) * KMH_PER_MPH : (Number.parseFloat(speed) || 0);
  const inclinePct = Number.parseFloat(incline) || 0;
  const isTreadmill = mode === 'treadmill';

  const kcal = isTreadmill
    ? treadmillKcal({ speedKmh, inclinePct, weightKg, minutes })
    : metKcal({ met, weightKg, minutes });
  const distKm = isTreadmill ? distanceKm(speedKmh, minutes) : 0;
  const canLog = minutes > 0 && (!isTreadmill || speedKmh > 0);

  const showDist = (km) => (imperial ? `${(km * MI_PER_KM).toFixed(2)} mi` : `${km.toFixed(2)} km`);
  const showSpeed = (kmh) => (imperial ? `${(kmh / KMH_PER_MPH).toFixed(1)} mph` : `${kmh.toFixed(1)} km/h`);

  function handleLog() {
    if (!canLog) return;
    logSet(exerciseId, {
      isWarmup: false,
      isCardio: true,
      durationSec: Math.round(minutes * 60),
      speedKmh: isTreadmill ? speedKmh : null,
      incline: isTreadmill ? inclinePct : null,
      distanceKm: distKm,
      calories: kcal,
      weight: 0,
      reps: 0,
      bonusXp: Math.round(minutes), // cardio earns XP by the minute
    });
    haptic('tap'); playChime('tick');
    onLogged?.();
    setMins(''); setSpeed(''); setIncline('');
  }

  return (
    <div className="mt-3">
      {/* Logged bouts */}
      {exercise.sets.map((s) => (
        <div key={s.setNumber} className="mb-1 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--color-ivory)' }}>
          <Flame size={13} style={{ color: 'var(--color-ember)', flexShrink: 0 }} />
          <span className="flex-1 font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {Math.round((s.durationSec || 0) / 60)} min
            {s.speedKmh ? ` · ${showSpeed(s.speedKmh)}` : ''}
            {s.incline ? ` · ${s.incline}%` : ''}
            {s.distanceKm ? ` · ${showDist(s.distanceKm)}` : ''}
          </span>
          <span className="font-mono text-xs font-semibold" style={{ color: 'var(--color-gold)' }}>{s.calories} kcal</span>
          <button onClick={() => removeSet(exerciseId, s.setNumber)} aria-label="Remove bout">
            <Trash2 size={13} style={{ color: 'var(--color-ash)' }} />
          </button>
        </div>
      ))}

      {/* Inputs */}
      <div className="mt-2 flex items-end gap-1.5">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block font-sans text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-ash)' }}>Minutes</span>
          <input value={mins} onChange={(e) => setMins(e.target.value)} placeholder="min" type="number" inputMode="decimal"
            className="w-full rounded-xl px-3 py-2.5 font-mono text-sm outline-none" style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }} />
        </label>
        {isTreadmill && (
          <>
            <label className="min-w-0 flex-1">
              <span className="mb-1 block font-sans text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-ash)' }}>Speed ({speedUnit})</span>
              <input value={speed} onChange={(e) => setSpeed(e.target.value)} placeholder={speedUnit} type="number" inputMode="decimal"
                className="w-full rounded-xl px-3 py-2.5 font-mono text-sm outline-none" style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }} />
            </label>
            <label className="min-w-0 flex-1">
              <span className="mb-1 block font-sans text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-ash)' }}>Incline %</span>
              <input value={incline} onChange={(e) => setIncline(e.target.value)} placeholder="0" type="number" inputMode="decimal"
                className="w-full rounded-xl px-3 py-2.5 font-mono text-sm outline-none" style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }} />
            </label>
          </>
        )}
        <button onClick={handleLog} disabled={!canLog} aria-label="Log cardio bout"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: canLog ? 1 : 0.35 }}>
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Live estimate */}
      {canLog && (
        <p className="mt-1.5 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          ≈ <span className="font-semibold" style={{ color: 'var(--color-gold)' }}>{kcal} kcal</span>
          {distKm ? ` · ${showDist(distKm)}` : ''}
          {' '}· +{Math.round(minutes)} XP
        </p>
      )}
    </div>
  );
}
