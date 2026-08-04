import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trophy, Clock, Zap, BookmarkPlus, Check } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { db } from '../../db/db.js';
import { calcWorkoutXP } from '../../utils/rpg.js';
import { computeVolume } from '../../utils/volume.js';
import { getCurrentBodyweight } from '../../utils/healthActions.js';
import { deriveRoutineName } from '../../utils/routineName.js';
import { fmtVolume } from '../../utils/units.js';
import { IRON_PER_SESSION, IRON_PER_PR } from '../../utils/economy.js';
import { strengthKcal } from '../../utils/calories.js';
import { Flame } from 'lucide-react';
import useSettingsStore from '../../store/settingsStore.js';
import { useRPG } from '../../hooks/useRPG.js';
import XPBar from '../rpg/XPBar.jsx';
import ShareButton from '../share/ShareButton.jsx';
import CountUp from '../fx/CountUp.jsx';

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export default function EndWorkoutModal({ isOpen, activeWorkout, elapsedSecs, onSave, onClose }) {
  const { profile } = useRPG();
  const unit = useSettingsStore((s) => s.unit);
  const stats = useMemo(() => {
    if (!activeWorkout) return null;
    const allSets = activeWorkout.exercises.flatMap((e) => e.sets);
    const workingSets = allSets.filter((s) => !s.isWarmup);
    const xp = calcWorkoutXP(workingSets);
    return {
      exercises: activeWorkout.exercises.length,
      sets: workingSets.length,
      xp,
    };
  }, [activeWorkout]);

  const totalVolume = useLiveQuery(async () => {
    if (!activeWorkout) return 0;
    const flat = activeWorkout.exercises.flatMap((e) => e.sets.map((s) => ({ ...s, exerciseId: e.exerciseId })));
    const bw = await getCurrentBodyweight();
    return computeVolume(flat, bw);
  }, [activeWorkout]) ?? 0;

  // Calories: cardio bouts are precise; lifting is a MET estimate over the
  // non-cardio time. `estimated` flags when any lifting is included.
  const cal = useLiveQuery(async () => {
    if (!activeWorkout) return { total: 0, estimated: false };
    const sets = activeWorkout.exercises.flatMap((e) => e.sets);
    const cardioKcal = sets.reduce((a, s) => a + (s.calories || 0), 0);
    const cardioMin = sets.reduce((a, s) => a + (s.durationSec || 0), 0) / 60;
    const hasStrength = sets.some((s) => !s.isCardio && !s.isWarmup && ((s.weight || 0) > 0 || (s.reps || 0) > 0));
    const bw = await getCurrentBodyweight();
    const strengthMin = hasStrength ? Math.max(0, elapsedSecs / 60 - cardioMin) : 0;
    return { total: Math.round(cardioKcal + strengthKcal({ weightKg: bw ?? 70, minutes: strengthMin })), estimated: hasStrength };
  }, [activeWorkout, elapsedSecs]) ?? { total: 0, estimated: false };

  // Per-muscle working-set counts drive both the share card's muscle list and
  // the auto-routine name.
  const muscleCounts = useLiveQuery(async () => {
    if (!activeWorkout) return {};
    const counts = {};
    for (const ex of activeWorkout.exercises) {
      const e = await db.exercises.get(ex.exerciseId);
      if (!e?.muscleGroup) continue;
      const working = ex.sets.filter((s) => !s.isWarmup).length || ex.sets.length;
      counts[e.muscleGroup] = (counts[e.muscleGroup] ?? 0) + working;
    }
    return counts;
  }, [activeWorkout]) ?? {};
  const muscles = Object.keys(muscleCounts);

  // Offer to keep an ad-hoc (non-template) session with ≥2 exercises as a routine.
  const canSaveRoutine = !!activeWorkout && activeWorkout.templateId == null && activeWorkout.exercises.length >= 2;
  const derived = useMemo(() => deriveRoutineName(muscleCounts), [muscleCounts]);
  const [saveRoutine, setSaveRoutine] = useState(true);
  const [routineName, setRoutineName] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched && derived.name) setRoutineName(derived.name);
  }, [derived.name, touched]);

  if (!stats) return null;

  const handleSave = () => {
    const trimmed = routineName.trim();
    const routine = canSaveRoutine && saveRoutine
      ? { saveRoutine: true, routineName: trimmed || derived.name, autoKey: derived.autoKey, nameEdited: trimmed !== derived.name }
      : null;
    onSave(stats.xp, routine);
  };

  const shareData = {
    name: activeWorkout.name,
    athlete: profile?.name || null,
    date: new Date().toISOString().slice(0, 10),
    duration: elapsedSecs,
    totalVolume,
    totalSets: stats.sets,
    xpEarned: stats.xp,
    muscles,
    pr: null,
    level: profile?.level ?? 1,
    unit,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Workout complete">
      {/* Stats grid */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ background: 'var(--color-ivory)' }}>
          <Clock size={14} style={{ color: 'var(--color-ash)' }} />
          <p className="mt-1 font-mono text-xl font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {formatDuration(elapsedSecs)}
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Duration</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'var(--color-ivory)' }}>
          <Trophy size={14} style={{ color: 'var(--color-ash)' }} />
          <p className="mt-1 font-mono text-xl font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {stats.sets}
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Sets</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'var(--color-ivory)' }}>
          <p className="font-sans text-xs font-medium" style={{ color: 'var(--color-ash)' }}>vol</p>
          <CountUp value={totalVolume} format={(n) => fmtVolume(n, unit)} className="mt-1 block font-mono text-xl font-medium" style={{ color: 'var(--color-text-primary)' }} />
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Total volume</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'var(--color-ivory)' }}>
          <Zap size={14} style={{ color: 'var(--color-gold)' }} />
          <CountUp value={stats.xp} format={(n) => `+${Math.round(n)}`} className="mt-1 block font-mono text-xl font-medium" style={{ color: 'var(--color-gold)' }} />
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>XP earned</p>
        </div>
      </div>

      {/* Iron reward — legible so you know what the session pays into the Vault. */}
      <div className="mb-3 flex items-center justify-center gap-2 rounded-xl py-2.5" style={{ background: 'var(--color-obsidian)' }}>
        <span style={{ display: 'inline-block', width: 12, height: 12, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, var(--color-gold), #a8791f)', borderRadius: 2 }} />
        <span className="font-mono text-sm font-bold" style={{ color: 'var(--color-gold)' }}>+{IRON_PER_SESSION} Iron</span>
        <span className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>this session · +{IRON_PER_PR} per PR</span>
      </div>

      {/* Calories burned */}
      {cal.total > 0 && (
        <div className="mb-5 flex items-center justify-center gap-2 rounded-xl py-2.5" style={{ background: 'var(--color-obsidian)' }}>
          <Flame size={14} style={{ color: 'var(--color-ember)' }} />
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--color-ember)' }}>{cal.total} kcal</span>
          <span className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>{cal.estimated ? 'burned (est.)' : 'burned'}</span>
        </div>
      )}

      {/* XP progress (animates the gained XP) */}
      {profile && (
        <div className="mb-5">
          <XPBar totalXp={(profile.totalXp ?? 0) + stats.xp} />
        </div>
      )}

      {/* Save this ad-hoc session as a reusable routine */}
      {canSaveRoutine && (
        <div className="mb-5 rounded-2xl p-3" style={{ background: 'var(--color-ivory)' }}>
          <button
            onClick={() => setSaveRoutine((v) => !v)}
            className="flex w-full items-center gap-2.5"
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
              style={{ background: saveRoutine ? 'var(--color-gold)' : 'var(--color-chalk)', border: saveRoutine ? 'none' : '1px solid var(--color-ash)' }}
            >
              {saveRoutine && <Check size={13} strokeWidth={3} style={{ color: 'var(--color-obsidian)' }} />}
            </span>
            <BookmarkPlus size={15} style={{ color: 'var(--color-gold)' }} />
            <span className="font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Save as routine
            </span>
          </button>
          {saveRoutine && (
            <input
              value={routineName}
              onChange={(e) => { setRoutineName(e.target.value); setTouched(true); }}
              placeholder="Routine name"
              className="mt-2.5 w-full rounded-xl px-3 py-2.5 font-sans text-sm outline-none"
              style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)', color: 'var(--color-text-primary)' }}
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          Keep going
        </button>
        <button
          onClick={handleSave}
          disabled={!stats || stats.sets === 0}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-medium"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: !stats || stats.sets === 0 ? 0.35 : 1 }}
        >
          Save & finish
        </button>
      </div>
      {stats && stats.sets === 0 && (
        <p className="mt-2 text-center font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Log at least one set to finish — or discard the session.
        </p>
      )}

      <ShareButton
        data={shareData}
        label="Share card"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-medium"
        style={{ background: 'var(--color-stone)', color: 'var(--color-text-inverse)' }}
      />
    </Modal>
  );
}
