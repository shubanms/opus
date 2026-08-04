import { useState, useEffect } from 'react';
import { Footprints, Droplet, Plus, Minus } from 'lucide-react';
import { useDailyActivity } from '../../hooks/useProgress.js';
import { setSteps, addWater } from '../../utils/healthActions.js';
import { crossedGoal } from '../../utils/goals.js';
import { playChime } from '../../utils/sound.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import Particles from '../fx/Particles.jsx';
import useSettingsStore from '../../store/settingsStore.js';
import useUIStore from '../../store/uiStore.js';

const RADIUS = 34;
const CIRC = 2 * Math.PI * RADIUS;

function Ring({ value, goal, color, icon: Icon, center, label }) {
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  const [draw, setDraw] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDraw(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="relative" style={{ width: 86, height: 86 }}>
        <svg width={86} height={86} viewBox="0 0 86 86">
          <circle cx={43} cy={43} r={RADIUS} fill="none" stroke="var(--color-ivory)" strokeWidth={7} />
          <circle
            cx={43} cy={43} r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - draw)}
            transform="rotate(-90 43 43)"
            style={{ transition: 'stroke-dashoffset 1.1s var(--opus-ease-out)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon size={16} style={{ color }} />
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{center}</span>
        </div>
      </div>
      <p className="mt-1 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
    </div>
  );
}

export default function ActivityRings() {
  const { steps, water } = useDailyActivity();
  const stepGoal = useSettingsStore((s) => s.stepGoal);
  const waterGoal = useSettingsStore((s) => s.waterGoal);
  const haptic = useHaptics();
  const [burst, setBurst] = useState(false);

  function celebrateGoal() {
    haptic('pr');
    playChime('goal');
    setBurst(true);
    setTimeout(() => setBurst(false), 1300);
  }

  async function editSteps() {
    const v = await useUIStore.getState().prompt({
      title: "Today's steps",
      placeholder: 'e.g. 8000',
      defaultValue: steps ? String(steps) : '',
    });
    if (v !== null && v !== '') {
      const next = Math.max(0, Number.parseInt(v) || 0);
      if (crossedGoal(steps, next, stepGoal)) celebrateGoal();
      setSteps(next);
    }
  }

  function addGlass() {
    if (crossedGoal(water, water + 1, waterGoal)) celebrateGoal();
    addWater(1);
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
      {burst && <Particles count={16} />}
      <p className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Today's activity
      </p>

      <div className="flex">
        <Ring value={steps} goal={stepGoal} color="var(--color-gold)" icon={Footprints} center={steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : steps} label={`${stepGoal.toLocaleString()} goal`} />
        <Ring value={water} goal={waterGoal} color="var(--color-sage)" icon={Droplet} center={water} label={`${waterGoal} glasses`} />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={editSteps}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          <Footprints size={15} /> Add steps
        </button>
        <button
          onClick={() => addWater(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--color-ivory)' }}
          aria-label="Remove a glass"
        >
          <Minus size={15} style={{ color: 'var(--color-ash)' }} />
        </button>
        <button
          onClick={addGlass}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-sm font-medium"
          style={{ background: 'var(--color-sage)', color: 'var(--color-text-inverse)' }}
        >
          <Plus size={15} /> Glass
        </button>
      </div>
    </div>
  );
}
