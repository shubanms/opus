import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Trash2, Flame, StickyNote, Trophy, Check, TrendingUp, Dumbbell, Pencil } from 'lucide-react';
import useWorkoutStore from '../../store/workoutStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import useUIStore from '../../store/uiStore.js';
import { useLastSets } from '../../hooks/useWorkout.js';
import { usePRs } from '../../hooks/useProgress.js';
import { useOverload } from '../../hooks/useOverload.js';
import { usePlateIncrement } from '../../hooks/usePlateIncrement.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import { toKg, toDisplay, unitLabel } from '../../utils/units.js';
import { diffsBySetNumber } from '../../utils/setDiff.js';
import { EFFORT_LEVELS, effortFromRpe } from '../../utils/effort.js';
import {
  prefillFrom,
  alignedPrevious,
  stepWeight,
  cleanRepsInput,
  cleanWeightInput,
  checkStrengthSet,
} from '../../utils/loadStep.js';
import { rollCrit, comboCount, setXp, CRIT_CHANCE } from '../../utils/crit.js';
import { beats, isRecordSet } from '../../utils/records.js';
import { todaysDungeon, affixEffects } from '../../utils/dungeon.js';
import Particles from '../fx/Particles.jsx';
import { AnimatePresence, m, SPRING, useReducedMotion } from '../../motion/index.jsx';
import PlateCalculator from './PlateCalculator.jsx';

// A weight for an input field: display unit, at most two decimals, no "80.00".
const fieldWeight = (kg, unit) => String(Math.round(toDisplay(kg, unit) * 100) / 100);
// A weight for reading: one decimal at most — "170.9", "80".
const shortWeight = (kg, unit) => {
  const v = Math.round(toDisplay(kg, unit) * 10) / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
};
const isWorking = (s) => s && !s.isWarmup && !s.isCardio && (s.weight > 0 || s.reps > 0);

// "vs last session" for a logged working set, as a short phrase.
function deltaText(diff, unit) {
  if (!diff || diff.dir === 'new') return null;
  if (diff.dir === 'same') return { text: '= last time', color: 'var(--color-ash)' };
  const parts = [];
  if (diff.weightDelta) parts.push(`${diff.weightDelta > 0 ? '+' : '−'}${shortWeight(Math.abs(diff.weightDelta), unit)} ${unitLabel(unit)}`);
  if (diff.repsDelta) parts.push(`${diff.repsDelta > 0 ? '+' : '−'}${Math.abs(diff.repsDelta)} rep${Math.abs(diff.repsDelta) === 1 ? '' : 's'}`);
  const up = diff.dir === 'up';
  return { text: `${up ? '▲' : '▼'} ${parts.join(' ')}`, color: up ? 'var(--color-gold)' : 'var(--color-ember)' };
}

/** A − value + box. The buttons are the full height of the box: 44 × 48. */
function Stepper({ label, value, onChange, onStep, placeholder, inputMode, decLabel, incLabel }) {
  return (
    <div className="flex h-12 min-w-0 flex-1 items-stretch rounded-2xl" style={{ background: 'var(--color-ivory)' }}>
      <button
        type="button"
        onClick={() => onStep(-1)}
        className="flex w-11 shrink-0 items-center justify-center rounded-l-2xl"
        aria-label={decLabel}
      >
        <Minus size={15} style={{ color: 'var(--color-ash)' }} />
      </button>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        enterKeyHint="done"
        className="min-w-0 flex-1 bg-transparent text-center font-mono text-lg tabular-nums outline-none"
        style={{ color: 'var(--color-text-primary)' }}
      />
      <button
        type="button"
        onClick={() => onStep(1)}
        className="flex w-11 shrink-0 items-center justify-center rounded-r-2xl"
        aria-label={incLabel}
      >
        <Plus size={15} style={{ color: 'var(--color-ash)' }} />
      </button>
    </div>
  );
}

export default function SetLogger({
  exerciseId,
  equipment = null,
  isBodyweight = false,
  rateUid = null,
  onSetLogged,
  onEffortRated,
  onSetRemoved,
}) {
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const logSet = useWorkoutStore((s) => s.logSet);
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const toggleWarmup = useWorkoutStore((s) => s.toggleWarmup);
  const setSetNote = useWorkoutStore((s) => s.setSetNote);
  const setSetRpe = useWorkoutStore((s) => s.setSetRpe);
  const effects = useSettingsStore((s) => s.effects);
  const reduced = useReducedMotion();
  const haptic = useHaptics();
  const { unit, increment } = usePlateIncrement();

  const exercise = activeWorkout?.exercises.find((e) => e.exerciseId === exerciseId);
  // Last session's sets in the order they were done. Older builds could save
  // two rows with one set number; completion time breaks the tie.
  const lastSets = [...useLastSets(exerciseId)].sort(
    (a, b) => a.setNumber - b.setNumber || (a.completedAt ?? 0) - (b.completedAt ?? 0) || a.id - b.id
  );
  const prs = usePRs(exerciseId);
  const bestOf = (type) => {
    const vals = prs.filter((p) => p.type === type).map((p) => p.value ?? 0);
    return vals.length ? Math.max(...vals) : null;
  };
  const weightPR = bestOf('weight');
  const repsPR = bestOf('reps');
  const volPR = bestOf('volume');

  const target = { targetWeight: exercise?.targetWeight ?? null, targetReps: exercise?.targetReps ?? null };
  const hasTarget = Number(target.targetWeight) > 0 || Number(target.targetReps) > 0;
  // With a routine target the routine decides the progression, and a second
  // opinion underneath it ("push for 9 at 77.5") contradicted the target
  // above it. The coaching line only speaks when there is no plan.
  const overload = useOverload(hasTarget ? null : exerciseId, { equipment });

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [addWeight, setAddWeight] = useState(false);
  const [warmup, setWarmup] = useState(false);
  const [editing, setEditing] = useState(null); // uid of the set being corrected
  const [showPlates, setShowPlates] = useState(false);
  const [xpFloat, setXpFloat] = useState(null);
  const [critBurst, setCritBurst] = useState(null);
  // Has the person typed or stepped since the last prefill? Untouched fields
  // follow the best prefill as data arrives (the routine target is known at
  // once, last session's sets a moment later); touched ones are never
  // overwritten.
  const touched = useRef(false);

  const sets = exercise?.sets ?? [];
  const workingCount = sets.filter(isWorking).length;
  const lastCount = lastSets.length;

  function applyPrefill() {
    const pre = prefillFrom(sets, lastSets, target);
    if (!pre) return;
    setWeight(pre.weight > 0 ? fieldWeight(pre.weight, unit) : '');
    setReps(pre.reps > 0 ? String(pre.reps) : '');
    // A weighted dip or pull-up: last time had a belt on, so the weight field
    // opens rather than hiding the number you are about to repeat.
    if (isBodyweight && pre.weight > 0) setAddWeight(true);
  }

  // `isBodyweight` is in the list because the exercise's equipment arrives a
  // beat after the first render: a weighted pull-up must open its weight field
  // once the app knows it is a pull-up.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the counts and targets, not the arrays — the live query hands back a new array on every tick
  useEffect(() => {
    if (editing || warmup || touched.current) return;
    applyPrefill();
  }, [workingCount, lastCount, unit, target.targetWeight, target.targetReps, editing, warmup, isBodyweight]);

  // The set being edited can disappear under us (deleted, or the delete of
  // another set was undone around it); drop out of edit mode if so.
  const editingGone = Boolean(editing) && !sets.some((s) => s.uid === editing);
  useEffect(() => {
    if (editingGone) setEditing(null);
  }, [editingGone]);

  // The "+N XP" float clears itself; with motion off it simply shows, then goes.
  useEffect(() => {
    if (!xpFloat) return undefined;
    const t = setTimeout(() => setXpFloat(null), 1000);
    return () => clearTimeout(t);
  }, [xpFloat]);

  if (!exercise) return null;

  const showWeight = !isBodyweight || addWeight;
  const weightNum = Number.parseFloat(weight);
  const repsNum = Number(reps);
  const check = checkStrengthSet({ weight: showWeight ? weight : '', reps: reps === '' ? Number.NaN : repsNum });
  const canLog = check.ok;
  const editingSet = editing ? sets.find((s) => s.uid === editing) ?? null : null;

  const type = (setter, clean) => (v) => {
    touched.current = true;
    setter(clean(v));
    setShowPlates(false);
  };
  const stepW = (d) => {
    touched.current = true;
    setWeight(String(stepWeight(weight, d, increment)));
    setShowPlates(false);
  };
  const stepR = (d) => {
    touched.current = true;
    setReps((r) => String(Math.max(1, (Number.parseInt(r, 10) || 0) + d)));
  };

  function burst() {
    if (!effects || reduced) return;
    setCritBurst(Date.now());
    setTimeout(() => setCritBurst(null), 1300);
  }

  function handleLog() {
    if (!canLog) return;
    if (editingSet) return handleUpdate();
    const weightKg = showWeight ? toKg(check.weight, unit) : 0;
    const r = check.reps;
    const now = Date.now();

    let crit = false;
    let combo = 1;
    let isPR = false;
    let bonus = 0;
    let base = 0;
    if (!warmup) {
      // A record is judged by the shared rule (utils/records.js) against the
      // stored record and the best already hit this session, so it fires once
      // per genuine new high — and never off kg↔lb rounding noise.
      const prior = sets.filter(isRecordSet);
      const best = (stored, pick) => {
        const vals = [stored ?? 0, ...prior.map(pick)].filter((v) => v > 0);
        return vals.length ? Math.max(...vals) : null;
      };
      isPR =
        beats(weightKg, best(weightPR, (s) => s.weight), 'weight') ||
        beats(r, best(repsPR, (s) => s.reps), 'reps') ||
        beats(weightKg * r, best(volPR, (s) => s.weight * s.reps), 'volume');

      // Crit + combo (utils/crit.js), stored on the set so every total already
      // includes it and a delete reverts it for free. The roll is keyed on the
      // session, the exercise and the set's position.
      const sessionWorking = (activeWorkout?.exercises ?? []).reduce(
        (n, e) => n + e.sets.filter((x) => !x.isWarmup).length, 0);
      const critChance = CRIT_CHANCE + (activeWorkout?.dungeon ? affixEffects(todaysDungeon(activeWorkout.dungeon).affixes).critBonus : 0);
      crit = rollCrit({ seed: activeWorkout?.startedAt ?? 0, exerciseId, setNumber: sets.length + 1, first: sessionWorking === 0, chance: critChance });
      const times = (activeWorkout?.exercises ?? [])
        .flatMap((e) => e.sets.filter((x) => !x.isWarmup).map((x) => x.completedAt))
        .filter(Boolean);
      combo = comboCount([...times, now]);
      // The float has to agree with what the end-of-session modal will total,
      // so it applies the same intensity weighting. Effort is deliberately not
      // in here: the set has not been rated yet at this instant.
      ({ base, bonus } = setXp({ weightKg, reps: r, best: weightPR, crit, combo }));
    }

    const logged = logSet(exerciseId, {
      weight: weightKg,
      reps: r,
      // Rated after the fact, on the logged row — never before the set.
      rpe: null,
      isWarmup: warmup,
      crit,
      combo,
      bonusXp: bonus,
    });
    if (!logged) return;

    if (warmup) {
      // Warm-ups get a tick, not a fanfare — they are not the work.
      haptic('tap');
      playChime('tick');
    } else {
      haptic(isPR || crit ? 'pr' : 'tap');
      playChime(isPR ? 'pr' : crit ? 'achievement' : 'tick');
      if (crit) burst();
      setXpFloat({ key: now, xp: base + bonus, pr: isPR, crit, combo });
    }
    onSetLogged?.(exerciseId, logged);
    // Deliberately NOT cleared. Most sets repeat the one before them, so
    // leaving the numbers in place makes "same again" a single tap and a step
    // up two taps — instead of retyping both fields twenty times a session.
  }

  function startEdit(s) {
    if (editing === s.uid) return cancelEdit();
    setEditing(s.uid);
    setWarmup(false);
    setShowPlates(false);
    const shown = s.weight > 0;
    if (isBodyweight) setAddWeight(shown);
    setWeight(shown ? fieldWeight(s.weight, unit) : '');
    setReps(String(s.reps || ''));
    haptic('tap');
  }

  function cancelEdit() {
    setEditing(null);
    touched.current = false;
    applyPrefill();
  }

  // Correct a logged set. Its crit and combo were decided when it was logged
  // and stay; the XP they pay is re-priced for the new numbers exactly as the
  // end-of-session total will count it.
  function handleUpdate() {
    const s = editingSet;
    const weightKg = showWeight ? toKg(check.weight, unit) : 0;
    const r = check.reps;
    const bonusXp = s.isWarmup ? 0 : setXp({ weightKg, reps: r, best: weightPR, crit: s.crit, combo: s.combo ?? 1 }).bonus;
    const updated = updateSet(exerciseId, s.setNumber, { weight: weightKg, reps: r, bonusXp });
    if (!updated) return;
    haptic('tap');
    playChime('tick');
    setEditing(null);
    touched.current = false;
    // Back to "what's next": this session's last working set.
    const pre = prefillFrom(
      sets.map((x) => (x.uid === updated.uid ? updated : x)),
      lastSets,
      target
    );
    if (pre) {
      setWeight(pre.weight > 0 ? fieldWeight(pre.weight, unit) : '');
      setReps(pre.reps > 0 ? String(pre.reps) : '');
    }
  }

  function toggleWarmupMode() {
    const next = !warmup;
    setWarmup(next);
    haptic('tap');
    // Leaving warm-up mode: the numbers in the boxes were warm-up numbers, so
    // load the working prefill back rather than logging the bar as a work set.
    if (!next) {
      touched.current = false;
      applyPrefill();
    }
  }

  async function editNote(s) {
    const value = await useUIStore.getState().prompt({
      title: `Set ${s.setNumber} note`,
      placeholder: 'e.g. last rep was a grind',
      defaultValue: s.note ?? '',
    });
    if (value !== null) setSetNote(exerciseId, s.setNumber, value.trim() || null);
  }

  const fmt = (s) => (s.weight > 0 ? `${shortWeight(s.weight, unit)} ${unitLabel(unit)} × ${s.reps}` : `${s.reps} reps`);
  // Per-set improvement vs the previous session (working sets only).
  const setDeltas = diffsBySetNumber(sets, lastSets);

  // One reference line: what you did last time, set by set — the one that
  // lines up with your next set is lit — and your best on the lift.
  const lastWorking = lastSets.filter(isWorking);
  const nextIndex = sets.filter(isWorking).length;
  const aligned = nextIndex < lastWorking.length ? alignedPrevious(lastSets, nextIndex) : null;
  const allBodyweight = lastWorking.length > 0 && lastWorking.every((s) => !(s.weight > 0));
  const nudge = !hasTarget && overload && overload.action !== 'maintain' ? overload : null;

  return (
    <div className="mt-3">
      {critBurst && <Particles key={critBurst} count={26} />}

      {(lastWorking.length > 0 || weightPR || repsPR) && (
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {lastWorking.length > 0 && (
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="font-sans text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ash)' }}>
                Last
              </span>
              {lastWorking.map((s, i) => (
                <span key={s.id ?? i} className="whitespace-nowrap">
                  {i > 0 && <span style={{ color: 'var(--color-ash)' }}>· </span>}
                  <span
                    style={
                      s === aligned
                        ? { color: 'var(--color-text-primary)', fontWeight: 600 }
                        : undefined
                    }
                  >
                    {s.weight > 0 ? `${shortWeight(s.weight, unit)}×${s.reps}` : s.reps}
                  </span>
                </span>
              ))}
              {allBodyweight && <span>reps</span>}
            </p>
          )}
          {(weightPR || repsPR) && (
            <p className="ml-auto flex items-center gap-1 whitespace-nowrap font-mono text-xs font-semibold" style={{ color: 'var(--color-gold)' }}>
              <Trophy size={12} aria-hidden />
              <span className="sr-only">Your best:</span>
              {weightPR ? `${shortWeight(weightPR, unit)} ${unitLabel(unit)}` : ''}
              {weightPR && repsPR ? ' · ' : ''}
              {repsPR ? `${repsPR} reps` : ''}
            </p>
          )}
        </div>
      )}

      {nudge && (
        <p className="mb-2 flex items-start gap-1.5 font-sans text-xs" style={{ color: 'var(--color-text-primary)' }}>
          <TrendingUp size={13} style={{ color: 'var(--color-gold)', marginTop: 1, flexShrink: 0 }} aria-hidden />
          {nudge.reason}
        </p>
      )}

      {/* Logged sets, keyed by their uid — a position can change, a set
          cannot — so a new one slides in and a removed one collapses. */}
      <AnimatePresence initial={false}>
        {sets.map((s) => {
          const delta = s.isWarmup ? null : deltaText(setDeltas[s.setNumber], unit);
          const effort = s.rpe > 0 ? effortFromRpe(s.rpe) : null;
          const isEditing = editing === s.uid;
          return (
            <m.div
              key={s.uid ?? `n${s.setNumber}`}
              layout
              transition={SPRING.layout}
              initial={{ opacity: 0, y: -6, scaleY: 0.9 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="mb-1 overflow-hidden rounded-xl py-1 pl-1 pr-1"
              style={{
                background: s.crit && !s.isWarmup ? 'var(--accent-wash)' : 'var(--color-ivory)',
                border: `1px solid ${isEditing ? 'var(--color-gold)' : s.crit && !s.isWarmup ? 'var(--accent-line)' : 'transparent'}`,
              }}
            >
              <div className="flex items-center">
                {/* The number doubles as the warm-up switch. It said so only in
                    a desktop tooltip; now the state is the label. */}
                <button
                  type="button"
                  onClick={() => { toggleWarmup(exerciseId, s.setNumber); haptic('tap'); }}
                  aria-pressed={Boolean(s.isWarmup)}
                  aria-label={s.isWarmup ? `Set ${s.setNumber}: warm-up. Tap to count it as a working set` : `Set ${s.setNumber}. Tap to mark as a warm-up`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center"
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs"
                    style={{
                      background: s.isWarmup ? 'var(--ember-wash, #FF8FA322)' : 'var(--color-chalk)',
                      color: 'var(--color-ash)',
                      boxShadow: effort ? `inset 0 0 0 2px ${effort.color}` : undefined,
                    }}
                  >
                    {s.isWarmup ? <Flame size={13} style={{ color: 'var(--color-ember)' }} /> : s.setNumber}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(s)}
                  aria-label={`${isEditing ? 'Stop editing' : 'Edit'} set ${s.setNumber}: ${fmt(s)}${s.isWarmup ? ', warm-up' : ''}`}
                  className="flex min-h-10 min-w-0 flex-1 flex-col justify-center py-1 pl-1 text-left"
                >
                  <span className="flex items-center gap-1.5 font-mono text-base tabular-nums" style={{ color: s.isWarmup ? 'var(--color-text-secondary)' : 'var(--color-text-primary)' }}>
                    {fmt(s)}
                    {isEditing && <Pencil size={12} style={{ color: 'var(--color-gold)' }} aria-hidden />}
                  </span>
                  {(delta || effort || s.isWarmup) && (
                    <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px]">
                      {s.isWarmup && <span style={{ color: 'var(--color-ember)' }}>warm-up</span>}
                      {delta && <span style={{ color: delta.color }}>{delta.text}</span>}
                      {delta && effort && <span style={{ color: 'var(--color-ash)' }}>·</span>}
                      {effort && <span style={{ color: effort.color }}>{effort.label}</span>}
                    </span>
                  )}
                </button>
                <button type="button" onClick={() => editNote(s)} aria-label={s.note ? `Set ${s.setNumber} note: ${s.note}` : `Add a note to set ${s.setNumber}`} className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <StickyNote size={15} style={{ color: s.note ? 'var(--color-gold)' : 'var(--color-ash)' }} />
                </button>
                <button type="button" onClick={() => onSetRemoved?.(exerciseId, s.setNumber)} aria-label={`Remove set ${s.setNumber}`} className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <Trash2 size={15} style={{ color: 'var(--color-ash)' }} />
                </button>
              </div>

              {/* Asked once, on the last set you logged anywhere in the session
                  — the only moment you actually remember how it felt. A chip
                  row lingering under every exercise's last set was nagging.
                  Any set's rating can still be changed by tapping it to edit. */}
              {!s.isWarmup && (isEditing || (s.uid === rateUid && !(s.rpe > 0))) && (
                <div className="flex flex-wrap items-center gap-1.5 pb-1.5 pl-11 pr-2">
                  <span className="font-sans text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    How did that feel?
                  </span>
                  {EFFORT_LEVELS.map((level) => {
                    const picked = effort?.key === level.key;
                    return (
                      <button
                        key={level.key}
                        type="button"
                        aria-pressed={picked}
                        onClick={() => {
                          // Tapping the current rating again clears it.
                          setSetRpe(exerciseId, s.setNumber, picked ? null : level.rpe);
                          haptic('tap');
                          if (!picked && !isEditing) onEffortRated?.(exerciseId, level.rpe);
                        }}
                        className="h-10 rounded-full px-3.5 font-sans text-xs font-semibold"
                        style={{
                          background: picked ? level.color : 'var(--color-chalk)',
                          color: picked ? 'var(--color-obsidian)' : level.color,
                        }}
                        aria-label={`${level.label} — ${level.rir}`}
                      >
                        {level.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {s.note && (
                <p className="pb-1.5 pl-11 pr-2 font-sans text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>{s.note}</p>
              )}
            </m.div>
          );
        })}
      </AnimatePresence>

      {/* Input row: big steppers, nothing else competing for the thumb. */}
      <div className="relative mt-2 flex items-center gap-1.5">
        {xpFloat && (xpFloat.xp > 0 || xpFloat.pr || xpFloat.crit) && (
          <span
            key={xpFloat.key}
            aria-live="polite"
            className="pointer-events-none absolute -top-5 right-1 z-10 flex items-center gap-1 font-mono text-sm font-bold"
            style={{ color: 'var(--color-gold)', animation: effects && !reduced ? 'floatUp 900ms var(--opus-ease-out) forwards' : 'none' }}
          >
            {(xpFloat.pr || xpFloat.crit) && <Trophy size={13} />}
            {xpFloat.pr ? 'PR! ' : xpFloat.crit ? 'CRIT! ' : ''}
            {xpFloat.xp > 0 ? `+${xpFloat.xp} XP` : ''}
            {xpFloat.combo > 1 ? ` ×${xpFloat.combo}` : ''}
          </span>
        )}
        {showWeight && (
          <>
            <Stepper
              label={`Weight in ${unitLabel(unit)}`}
              value={weight}
              onChange={type(setWeight, cleanWeightInput)}
              onStep={stepW}
              placeholder={unitLabel(unit)}
              inputMode="decimal"
              decLabel="Less weight"
              incLabel="More weight"
            />
            <span className="font-sans text-sm" style={{ color: 'var(--color-ash)' }} aria-hidden>×</span>
          </>
        )}
        <Stepper
          label="Reps"
          value={reps}
          onChange={type(setReps, cleanRepsInput)}
          onStep={stepR}
          placeholder="reps"
          inputMode="numeric"
          decLabel="Fewer reps"
          incLabel="More reps"
        />
      </div>

      {/* Second row: how this set counts, and the action. */}
      <div className="mt-2 flex items-center gap-1.5">
        {editingSet ? (
          <>
            <p className="min-w-0 flex-1 truncate font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Editing set {editingSet.setNumber}
            </p>
            <button
              type="button"
              onClick={cancelEdit}
              className="h-11 shrink-0 rounded-xl px-4 font-sans text-sm font-medium"
              style={{ background: 'var(--color-ivory)', color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleWarmupMode}
              aria-pressed={warmup}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 font-sans text-xs font-semibold"
              style={{
                background: warmup ? 'var(--color-ember)' : 'var(--color-ivory)',
                color: warmup ? 'var(--color-obsidian)' : 'var(--color-text-secondary)',
              }}
            >
              <Flame size={14} /> Warm-up
            </button>
            {equipment === 'barbell' && showWeight && weightNum > 0 && (
              <button
                type="button"
                onClick={() => setShowPlates((v) => !v)}
                aria-pressed={showPlates}
                aria-label="Plate calculator"
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 font-sans text-xs font-semibold"
                style={{
                  background: showPlates ? 'var(--accent-wash)' : 'var(--color-ivory)',
                  color: showPlates ? 'var(--color-gold)' : 'var(--color-text-secondary)',
                }}
              >
                <Dumbbell size={14} /> Plates
              </button>
            )}
            {isBodyweight && (
              // Toggling hides the weight field but keeps what you typed in it.
              <button
                type="button"
                onClick={() => { setAddWeight((v) => !v); setShowPlates(false); }}
                aria-pressed={addWeight}
                aria-label={addWeight ? 'Bodyweight only' : 'Add weight'}
                className="h-11 shrink-0 rounded-xl px-3 font-sans text-xs font-semibold"
                style={{ background: 'var(--color-ivory)', color: 'var(--color-text-secondary)' }}
              >
                {addWeight ? 'BW only' : '+ Weight'}
              </button>
            )}
            <span className="flex-1" />
          </>
        )}
        <button
          type="button"
          onClick={handleLog}
          disabled={!canLog}
          aria-label={editingSet ? `Update set ${editingSet.setNumber}` : warmup ? 'Log warm-up' : 'Log set'}
          className="flex h-12 shrink-0 items-center justify-center gap-1.5 px-5 font-sans text-sm font-bold"
          style={{
            background: warmup && !editingSet ? 'var(--color-ember)' : 'var(--grad-accent)',
            color: 'var(--color-obsidian)',
            borderRadius: 'var(--opus-radius-md)',
            boxShadow: canLog ? 'var(--glow-accent)' : 'none',
            opacity: canLog ? 1 : 0.35,
          }}
        >
          {editingSet ? (
            <><Check size={17} strokeWidth={2.75} /> Update</>
          ) : warmup ? (
            // Ember and a flame say "warm-up"; the word is on the toggle beside it.
            <><Flame size={16} strokeWidth={2.5} /> Log</>
          ) : (
            <><Plus size={17} strokeWidth={2.75} /> Log</>
          )}
        </button>
      </div>

      {/* Plate calculator — a barbell thing, so only for barbell lifts. */}
      {showPlates && equipment === 'barbell' && weightNum > 0 && showWeight && (
        <PlateCalculator weight={weightNum} onClose={() => setShowPlates(false)} />
      )}
    </div>
  );
}
