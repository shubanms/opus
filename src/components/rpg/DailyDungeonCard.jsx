import { Check, Target } from 'lucide-react';
import { UI_KANJI } from '../../utils/kanji.js';
import '../../styles/ink-home.css';
import { todaysDungeon, affixEffects, dungeonObjective, dungeonClearedOn } from '../../utils/dungeon.js';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db.js';
import { generateRoutine, makeRng } from '../../utils/routineGenerator.js';
import { hashSeed } from '../../utils/crit.js';
import { useTodayKey } from '../../hooks/useTodayKey.js';
import { useRPG } from '../../hooks/useRPG.js';
import { useExercises } from '../../hooks/useExercises.js';
import useWorkoutStore from '../../store/workoutStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import { useNavigate } from 'react-router-dom';
import { playChime } from '../../utils/sound.js';
import { confirmReplaceSession } from '../../utils/sessionGuard.js';

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

  // Re-renders at midnight: a card left open overnight kept offering
  // yesterday's dungeon, already marked cleared.
  const today = useTodayKey();
  const dungeon = todaysDungeon(today);
  const fx = affixEffects(dungeon.affixes);
  const objective = dungeonObjective(dungeon);
  // From the day's workout rows, not just settings: deleting the session that
  // cleared it re-opens the dungeon (and its Iron leaves with it).
  const todayRows = useLiveQuery(() => db.workouts.where('date').equals(today).toArray(), [today]);
  const cleared = dungeonClearedOn(todayRows ?? [], today, lastDungeonClaim);

  async function enter() {
    // The card stays on Home while a session is open, and entering used to
    // overwrite that session — sets and all — without a word.
    if (!(await confirmReplaceSession('the dungeon'))) return;
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

  const affixNames = dungeon.affixes.map((a) => a.name).join(' · ');
  return (
    <button
      type="button"
      onClick={enter}
      aria-label={cleared ? 'Run again' : 'Enter dungeon'}
      title={dungeon.affixes.map((a) => `${a.name}: ${a.desc}`).join(" / ")}
      className="hm-trial"
    >
      <span className="hm-trial__row">
        <span className="hm-trial__kanji" lang="ja">{UI_KANJI.trial}</span>
        <span className="hm-trial__body">
          <span className="hm-trial__eyebrow">TRIAL OF THE DAY</span>
          <span className="hm-trial__name">{dungeon.name}</span>
          <span className="hm-trial__duel">Duel: {dungeon.boss}{affixNames ? ` · ${affixNames}` : ''} · {dungeon.group}</span>
        </span>
        <span className="hm-trial__iron">
          <span className="hm-trial__amt">+{dungeon.ironReward}{fx.ironMult > 1 ? ` ×${fx.ironMult}` : ''}</span>
          <span className="hm-trial__unit">Iron</span>
        </span>
      </span>
      <span className="hm-trial__obj">
        <Target size={13} aria-hidden style={{ color: cleared ? 'var(--ver-soft)' : 'var(--gold-leaf)' }} />
        {cleared ? 'Cleared today — Iron awarded' : `Clear it: log ${objective.minSets}+ working sets in this dungeon`}
      </span>
      <span className={`hm-trial__cta${cleared ? ' hm-trial__cta--done' : ''}`} aria-hidden>
        {cleared ? <><Check size={15} /> Run again</> : 'Enter dungeon'}
      </span>
    </button>
  );
}
