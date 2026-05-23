import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trophy, Clock, Zap } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { db } from '../../db/db.js';
import { calcWorkoutXP } from '../../utils/rpg.js';
import { useRPG } from '../../hooks/useRPG.js';
import XPBar from '../rpg/XPBar.jsx';
import ShareButton from '../share/ShareButton.jsx';

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export default function EndWorkoutModal({ isOpen, activeWorkout, elapsedSecs, onSave, onClose }) {
  const { profile } = useRPG();
  const stats = useMemo(() => {
    if (!activeWorkout) return null;
    const allSets = activeWorkout.exercises.flatMap((e) => e.sets);
    const workingSets = allSets.filter((s) => !s.isWarmup);
    const totalVolume = Math.round(workingSets.reduce((s, x) => s + x.weight * x.reps, 0));
    const xp = calcWorkoutXP(workingSets);
    return {
      exercises: activeWorkout.exercises.length,
      sets: workingSets.length,
      totalVolume,
      xp,
    };
  }, [activeWorkout]);

  const muscles = useLiveQuery(async () => {
    if (!activeWorkout) return [];
    const set = new Set();
    for (const ex of activeWorkout.exercises) {
      const e = await db.exercises.get(ex.exerciseId);
      if (e?.muscleGroup) set.add(e.muscleGroup);
    }
    return [...set];
  }, [activeWorkout]) ?? [];

  if (!stats) return null;

  const shareData = {
    name: activeWorkout.name,
    date: new Date().toISOString().slice(0, 10),
    duration: elapsedSecs,
    totalVolume: stats.totalVolume,
    totalSets: stats.sets,
    xpEarned: stats.xp,
    muscles,
    pr: null,
    level: profile?.level ?? 1,
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
          <p className="font-sans text-xs font-medium" style={{ color: 'var(--color-ash)' }}>kg</p>
          <p className="mt-1 font-mono text-xl font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {stats.totalVolume.toLocaleString()}
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Total volume</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'var(--color-ivory)' }}>
          <Zap size={14} style={{ color: 'var(--color-gold)' }} />
          <p className="mt-1 font-mono text-xl font-medium" style={{ color: 'var(--color-gold)' }}>
            +{stats.xp}
          </p>
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>XP earned</p>
        </div>
      </div>

      {/* XP progress (animates the gained XP) */}
      {profile && (
        <div className="mb-5">
          <XPBar totalXp={(profile.totalXp ?? 0) + stats.xp} />
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
          onClick={() => onSave(stats.xp)}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-medium"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          Save & finish
        </button>
      </div>

      <ShareButton
        data={shareData}
        label="Share card"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-medium"
        style={{ background: 'var(--color-stone)', color: 'var(--color-chalk)' }}
      />
    </Modal>
  );
}
