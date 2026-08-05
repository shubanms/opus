import { useState } from 'react';
import { Plus, Minus, Trash2, Flame, Dumbbell, StickyNote, Info, Trophy } from 'lucide-react';
import useWorkoutStore from '../../store/workoutStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import useUIStore from '../../store/uiStore.js';
import { useLastSets } from '../../hooks/useWorkout.js';
import { usePRs } from '../../hooks/useProgress.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import { toKg, toDisplay, unitLabel } from '../../utils/units.js';
import { calcSetXP } from '../../utils/rpg.js';
import { diffsBySetNumber } from '../../utils/setDiff.js';
import { rollCrit, comboCount, bonusXp as critBonusXp, CRIT_CHANCE } from '../../utils/crit.js';
import { todaysDungeon, affixEffects } from '../../utils/dungeon.js';
import Particles from '../fx/Particles.jsx';
import PlateCalculator from './PlateCalculator.jsx';

// Compact "vs last session" badge for a logged working set.
function SetDelta({ diff, unit }) {
  if (!diff || diff.dir === 'new') return null;
  const color = diff.dir === 'up' ? 'var(--color-gold)' : diff.dir === 'down' ? 'var(--color-ember)' : 'var(--color-ash)';
  const arrow = diff.dir === 'up' ? '▲' : diff.dir === 'down' ? '▼' : '＝';
  const wD = diff.weightDelta;
  const parts = [];
  if (wD) parts.push(`${wD > 0 ? '+' : '−'}${toDisplay(Math.abs(wD), unit)}${unitLabel(unit)}`);
  if (diff.repsDelta) parts.push(`${diff.repsDelta > 0 ? '+' : '−'}${Math.abs(diff.repsDelta)}r`);
  return (
    <span className="flex items-center gap-0.5 font-mono text-xs" style={{ color }} title="vs last session">
      <span style={{ fontSize: '0.6rem' }}>{arrow}</span>
      {parts.join(' ')}
    </span>
  );
}

const RPE_CHIPS = [6, 7, 8, 9, 10];

export default function SetLogger({ exerciseId, onSetLogged, isBodyweight = false }) {
  const { activeWorkout, logSet, removeSet, toggleWarmup, setSetNote } = useWorkoutStore();
  const unit = useSettingsStore((s) => s.unit);
  const haptic = useHaptics();
  const exercise = activeWorkout?.exercises.find((e) => e.exerciseId === exerciseId);
  const lastSets = useLastSets(exerciseId);
  const prs = usePRs(exerciseId);
  // When following a routine, surface the best PR to chase instead of the last
  // session's numbers.
  const fromTemplate = activeWorkout?.templateId != null;
  const weightPR = prs.find((p) => p.type === 'weight');
  const repsPR = prs.find((p) => p.type === 'reps');
  const volPR = prs.find((p) => p.type === 'volume');
  const showPR = fromTemplate && (weightPR || repsPR);

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState(null);
  const [showRpe, setShowRpe] = useState(false);
  const [showRpeInfo, setShowRpeInfo] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [addWeight, setAddWeight] = useState(false);
  const [xpFloat, setXpFloat] = useState(null);
  const [critBurst, setCritBurst] = useState(null);

  if (!exercise) return null;

  const showWeight = !isBodyweight || addWeight;
  const weightNum = Number.parseFloat(weight);
  const repsNum = Number.parseInt(reps);
  const canLog = showWeight ? (weightNum > 0 || repsNum > 0) : repsNum > 0;

  function stepReps(d) {
    setReps((r) => String(Math.max(0, (Number.parseInt(r) || 0) + d)));
  }

  function handleLog() {
    if (!canLog) return;
    const weightKg = showWeight ? toKg(weightNum || 0, unit) : 0;
    const r = repsNum || 0;

    // A working set beats a PR when it exceeds both the stored record and the
    // best already hit this session (so we celebrate once per genuine new high).
    const working = exercise.sets.filter((s) => !s.isWarmup);
    const bestWeight = Math.max(weightPR?.value ?? 0, ...working.map((s) => s.weight), 0);
    const bestReps = Math.max(repsPR?.value ?? 0, ...working.map((s) => s.reps), 0);
    const bestVol = Math.max(volPR?.value ?? 0, ...working.map((s) => s.weight * s.reps), 0);
    const isPR = (weightKg > 0 || r > 0) && (weightKg > bestWeight || r > bestReps || weightKg * r > bestVol);

    // Crit + combo (utils/crit.js). The bonus is stored on the set, so xpEarned
    // and every XP total already include it and a delete reverts it for free.
    const sessionWorking = (activeWorkout?.exercises ?? []).reduce(
      (n, e) => n + e.sets.filter((x) => !x.isWarmup).length, 0);
    // In a Daily Dungeon with the Volatile affix, crit chance runs hot.
    const critChance = CRIT_CHANCE + (activeWorkout?.dungeon ? affixEffects(todaysDungeon(activeWorkout.dungeon).affixes).critBonus : 0);
    const crit = rollCrit({ seed: activeWorkout?.startedAt ?? 0, setNumber: exercise.sets.length + 1, first: sessionWorking === 0, chance: critChance });
    const times = (activeWorkout?.exercises ?? [])
      .flatMap((e) => e.sets.filter((x) => !x.isWarmup).map((x) => x.completedAt))
      .filter(Boolean);
    const combo = comboCount([...times, Date.now()]);
    const base = calcSetXP(weightKg, r);
    const bonus = critBonusXp(base, { crit, combo });

    logSet(exerciseId, {
      weight: weightKg,
      reps: r,
      rpe: showRpe ? rpe : null,
      isWarmup: false,
      crit,
      bonusXp: bonus,
    });
    haptic(isPR || crit ? 'pr' : 'tap');
    playChime(isPR ? 'pr' : crit ? 'achievement' : 'tick');
    if (crit) { setCritBurst(Date.now()); setTimeout(() => setCritBurst(null), 1300); }
    setXpFloat({ key: Date.now(), xp: base + bonus, pr: isPR, crit, combo });
    onSetLogged?.();
    setReps('');
    setRpe(null);
  }

  async function editNote(setNumber, current) {
    const value = await useUIStore.getState().prompt({
      title: 'Set note',
      placeholder: 'e.g. last rep was a grind',
      defaultValue: current ?? '',
    });
    if (value !== null) setSetNote(exerciseId, setNumber, value);
  }

  const fmt = (s) => (s.weight > 0 ? `${toDisplay(s.weight, unit)}${unitLabel(unit)} × ${s.reps}` : `${s.reps} reps`);
  // Per-set improvement vs the previous session (working sets only).
  const setDeltas = diffsBySetNumber(exercise.sets, lastSets);

  return (
    <div className="mt-3">
      {critBurst && <Particles key={critBurst} count={26} />}
      {/* Reference line: your best PR when following a routine, else the ghost
          of last session's sets. */}
      {showPR ? (
        <div className="mb-2 flex items-center gap-1.5">
          <Trophy size={12} style={{ color: 'var(--color-gold)' }} />
          <span className="font-mono text-xs font-semibold" style={{ color: 'var(--color-gold)' }}>
            {weightPR ? `${toDisplay(weightPR.value, unit)}${unitLabel(unit)}` : ''}
            {weightPR && repsPR ? ' · ' : ''}
            {repsPR ? `${repsPR.value} reps` : ''}
          </span>
          <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }}>
            your best
          </span>
        </div>
      ) : lastSets.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-3">
          {lastSets.map((s) => (
            <span key={s.id} className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {s.weight > 0 ? `${toDisplay(s.weight, unit)}×${s.reps}` : `${s.reps}`}
            </span>
          ))}
          <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}>
            last session
          </span>
        </div>
      )}

      {/* Logged sets */}
      {exercise.sets.map((s) => (
        <div key={s.setNumber} className="mb-1 rounded-xl px-3 py-2" style={{ background: 'var(--color-ivory)' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleWarmup(exerciseId, s.setNumber)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: s.isWarmup ? '#FF8FA322' : 'transparent' }}
              title="Toggle warmup"
            >
              {s.isWarmup
                ? <Flame size={12} style={{ color: 'var(--color-ember)' }} />
                : <span className="font-mono text-xs" style={{ color: 'var(--color-ash)' }}>{s.setNumber}</span>}
            </button>
            <span className="flex-1 font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {fmt(s)}
            </span>
            {!s.isWarmup && <SetDelta diff={setDeltas[s.setNumber]} unit={unit} />}
            {s.rpe && (
              <span className="font-mono text-xs" style={{ color: 'var(--color-ash)' }}>RPE {s.rpe}</span>
            )}
            <button onClick={() => editNote(s.setNumber, s.note)} aria-label="Set note">
              <StickyNote size={13} style={{ color: s.note ? 'var(--color-gold)' : 'var(--color-ash)' }} />
            </button>
            <button onClick={() => removeSet(exerciseId, s.setNumber)} aria-label="Remove set">
              <Trash2 size={13} style={{ color: 'var(--color-ash)' }} />
            </button>
          </div>
          {s.note && (
            <p className="mt-1 pl-8 font-sans text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>{s.note}</p>
          )}
        </div>
      ))}

      {/* Input row */}
      <div className="relative mt-2 flex items-center gap-1.5">
        {xpFloat && (xpFloat.xp > 0 || xpFloat.pr || xpFloat.crit) && (
          <span
            key={xpFloat.key}
            className="pointer-events-none absolute right-1 top-0 flex items-center gap-1 font-mono text-sm font-bold"
            style={{ color: 'var(--color-gold)', animation: 'floatUp 900ms var(--opus-ease-out) forwards' }}
            onAnimationEnd={() => setXpFloat(null)}
          >
            {(xpFloat.pr || xpFloat.crit) && <Trophy size={13} />}
            {xpFloat.pr ? 'PR! ' : xpFloat.crit ? 'CRIT! ' : ''}
            {xpFloat.xp > 0 ? `+${xpFloat.xp} XP` : ''}
            {xpFloat.combo > 1 ? ` ×${xpFloat.combo}` : ''}
          </span>
        )}
        {showWeight && (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-xl px-3 py-2.5" style={{ background: 'var(--color-ivory)' }}>
              <input
                value={weight}
                onChange={(e) => { setWeight(e.target.value); setShowPlates(false); }}
                placeholder={unitLabel(unit)}
                type="number"
                inputMode="decimal"
                className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
                style={{ color: 'var(--color-text-primary)' }}
              />
              {weightNum > 0 && (
                <button onClick={() => setShowPlates((v) => !v)} aria-label="Plate calculator">
                  <Dumbbell size={13} style={{ color: showPlates ? 'var(--color-gold)' : 'var(--color-ash)' }} />
                </button>
              )}
            </div>
            <span className="font-sans text-sm" style={{ color: 'var(--color-ash)' }}>×</span>
          </>
        )}

        <div className="flex min-w-0 flex-1 items-center rounded-xl" style={{ background: 'var(--color-ivory)' }}>
          <button onClick={() => stepReps(-1)} className="flex h-full shrink-0 items-center px-2 py-2.5" aria-label="Fewer reps">
            <Minus size={14} style={{ color: 'var(--color-ash)' }} />
          </button>
          <input
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="reps"
            type="number"
            inputMode="numeric"
            className="min-w-0 flex-1 bg-transparent text-center font-mono text-sm outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
          <button onClick={() => stepReps(1)} className="flex h-full shrink-0 items-center px-2 py-2.5" aria-label="More reps">
            <Plus size={14} style={{ color: 'var(--color-ash)' }} />
          </button>
        </div>

        <button
          onClick={handleLog}
          disabled={!canLog}
          aria-label="Log set"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: canLog ? 1 : 0.35 }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Toggles */}
      <div className="mt-1 flex items-center gap-4">
        <button onClick={() => setShowRpe((v) => !v)} className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {showRpe ? 'Hide effort' : '+ Add effort (RPE)'}
        </button>
        <button onClick={() => setShowRpeInfo((v) => !v)} aria-label="What is RPE?" className="flex items-center">
          <Info size={13} style={{ color: 'var(--color-ash)' }} />
        </button>
        {isBodyweight && (
          <button
            onClick={() => { setAddWeight((v) => !v); setWeight(''); setShowPlates(false); }}
            className="ml-auto font-sans text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {addWeight ? 'Bodyweight only' : '+ Add weight'}
          </button>
        )}
      </div>

      {showRpeInfo && (
        <p className="mt-2 rounded-xl px-3 py-2 font-sans text-xs" style={{ background: 'var(--color-ivory)', color: 'var(--color-text-secondary)' }}>
          <b style={{ color: 'var(--color-text-primary)' }}>RPE</b> = how hard the set felt, 1–10. Think "reps left in the tank":
          10 = all-out, 9 ≈ 1 left, 8 ≈ 2 left. It's optional — it helps track intensity over time.
        </p>
      )}

      {showRpe && (
        <div className="mt-2">
          <div className="flex gap-1.5">
            {RPE_CHIPS.map((n) => (
              <button
                key={n}
                onClick={() => setRpe(rpe === n ? null : n)}
                className="h-10 flex-1 rounded-lg font-mono text-sm font-medium"
                style={{
                  background: rpe === n ? 'var(--color-gold)' : 'var(--color-ivory)',
                  color: rpe === n ? 'var(--color-obsidian)' : 'var(--color-text-primary)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Plate calculator */}
      {showPlates && weightNum > 0 && (
        <PlateCalculator weight={weightNum} onClose={() => setShowPlates(false)} />
      )}
    </div>
  );
}
