import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Check } from 'lucide-react';
import { todaysDungeon } from '../../utils/dungeon.js';
import { todayKey } from '../../utils/dateKey.js';
import Particles from '../fx/Particles.jsx';
import { useRPG } from '../../hooks/useRPG.js';
import useWorkoutStore from '../../store/workoutStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';

// Today's deterministic dungeon: a themed session with affixes + an Iron reward
// you can claim once you've trained today.
export default function DailyDungeonCard() {
  const navigate = useNavigate();
  const { profile } = useRPG();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const lastDungeonClaim = useSettingsStore((s) => s.lastDungeonClaim);
  const claimDungeon = useSettingsStore((s) => s.claimDungeon);
  const haptic = useHaptics();
  const [burst, setBurst] = useState(null);

  const today = todayKey();
  const dungeon = todaysDungeon(today);
  const trainedToday = profile?.lastWorkoutDate === today;
  const claimed = lastDungeonClaim === today;

  function enter() {
    startWorkout(dungeon.name);
    playChime('start');
    navigate('/workout');
  }
  function claim() {
    if (!trainedToday || claimed) return;
    claimDungeon(dungeon.ironReward, today);
    haptic('pr'); playChime('quest'); setBurst(Date.now()); setTimeout(() => setBurst(null), 1200);
  }

  return (
    <div className="mb-4 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-gold)' }}>
      {burst && <Particles key={burst} count={22} />}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-gold)' }}>
          <Swords size={13} /> Daily Dungeon
        </span>
        <span className="flex items-center gap-1 font-mono text-xs font-bold" style={{ color: 'var(--color-gold)' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, var(--color-gold), #a8791f)', borderRadius: 2 }} />
          {dungeon.ironReward}
        </span>
      </div>
      <h3 className="mt-1.5 font-display text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{dungeon.name}</h3>
      <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>⚔ {dungeon.boss} · {dungeon.group}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {dungeon.affixes.map((a) => (
          <span key={a.id} className="rounded-full px-2 py-0.5 font-sans text-[11px]" style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }} title={a.desc}>
            {a.name}
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={enter} className="flex-1 rounded-xl py-2 font-sans text-sm font-semibold" style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}>
          Enter dungeon
        </button>
        {trainedToday && (
          <button
            onClick={claim}
            disabled={claimed}
            className="flex items-center justify-center gap-1 rounded-xl px-3 py-2 font-mono text-sm font-bold"
            style={{ background: claimed ? 'var(--color-ivory)' : 'var(--color-obsidian)', color: claimed ? 'var(--color-ash)' : 'var(--color-gold)' }}
          >
            {claimed ? <><Check size={13} /> Claimed</> : `Claim ◆${dungeon.ironReward}`}
          </button>
        )}
      </div>
    </div>
  );
}
