import { Swords, Check, Target } from 'lucide-react';
import { todaysDungeon, affixEffects, dungeonObjective } from '../../utils/dungeon.js';
import { generateRoutine, makeRng } from '../../utils/routineGenerator.js';
import { hashSeed } from '../../utils/crit.js';
import { todayKey } from '../../utils/dateKey.js';
import { useRPG } from '../../hooks/useRPG.js';
import { useExercises } from '../../hooks/useExercises.js';
import useWorkoutStore from '../../store/workoutStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import { useNavigate } from 'react-router-dom';
import { playChime } from '../../utils/sound.js';

// Map a numeric level to the generator's difficulty band.
function levelBand(level = 1) {
  if (level >= 25) return 'advanced';
  if (level >= 10) return 'intermediate';
  return 'beginner';
}

// Today's deterministic dungeon: a themed session for a muscle group with
// affixes and an Iron reward. Entering builds the themed workout; clearing the
// working-set objective auto-awards the Iron (no manual claim).
export default function DailyDungeonCard() {
  const navigate = useNavigate();
  const { profile } = useRPG();
  const allExercises = useExercises();
  const startDungeon = useWorkoutStore((s) => s.startDungeon);
  const lastDungeonClaim = useSettingsStore((s) => s.lastDungeonClaim);

  const today = todayKey();
  const dungeon = todaysDungeon(today);
  const fx = affixEffects(dungeon.affixes);
  const objective = dungeonObjective(dungeon);
  const cleared = lastDungeonClaim === today;

  function enter() {
    const level = levelBand(profile?.level ?? 1);
    const rng = makeRng(Math.floor(hashSeed(dungeon.dateKey, 'gen') * 1e9));
    const slots = generateRoutine({ exercises: allExercises, groups: dungeon.muscles, level, rng });
    const exercises = slots.map((s) => {
      const ex = allExercises.find((e) => e.id === s.exerciseId);
      return {
        exerciseId: s.exerciseId,
        name: ex?.name ?? 'Exercise',
        targetSets: (s.targetSets ?? 3) + fx.extraSets, // Endurance: +1 set
        targetReps: s.targetReps,
        targetWeight: s.targetWeight,
      };
    });
    startDungeon(dungeon, exercises);
    playChime('start');
    navigate('/workout');
  }

  return (
    <div className="mb-4 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-gold)' }}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-gold)' }}>
          <Swords size={13} /> Daily Dungeon
        </span>
        <span className="flex items-center gap-1 font-mono text-xs font-bold" style={{ color: 'var(--color-gold)' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, var(--color-gold), #a8791f)', borderRadius: 2 }} />
          {dungeon.ironReward}{fx.ironMult > 1 ? ` ×${fx.ironMult}` : ''}
        </span>
      </div>
      <h3 className="mt-1.5 font-display text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{dungeon.name}</h3>
      <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>⚔ {dungeon.boss} · {dungeon.group}</p>

      {/* Objective — how to clear it. */}
      <div className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: 'var(--color-ivory)' }}>
        <Target size={13} style={{ color: cleared ? 'var(--color-sage)' : 'var(--color-gold)' }} />
        <span className="font-sans text-xs" style={{ color: 'var(--color-text-primary)' }}>
          {cleared ? 'Cleared today — Iron awarded ✓' : `Clear it: log ${objective.minSets}+ working sets in this dungeon`}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {dungeon.affixes.map((a) => (
          <span key={a.id} className="rounded-full px-2 py-0.5 font-sans text-[11px]" style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }} title={a.desc}>
            {a.name}
          </span>
        ))}
      </div>

      <button
        onClick={enter}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 font-sans text-sm font-semibold"
        style={{ background: cleared ? 'var(--color-ivory)' : 'var(--color-gold)', color: cleared ? 'var(--color-text-primary)' : 'var(--color-obsidian)' }}
      >
        {cleared ? <><Check size={15} /> Run again</> : 'Enter dungeon'}
      </button>
    </div>
  );
}
