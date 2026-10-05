import { useState, useEffect } from 'react';
import { Footprints, Droplet, Plus, Minus } from 'lucide-react';
import { useDailyActivity } from '../../hooks/useProgress.js';
import { setSteps, addWater } from '../../utils/healthActions.js';
import { crossedGoal } from '../../utils/goals.js';
import { readField, rangeHint } from '../../utils/health.js';
import { todayKey } from '../../utils/dateKey.js';
import { playChime } from '../../utils/sound.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import Particles from '../fx/Particles.jsx';
import Modal from '../ui/Modal.jsx';
import { NumberRow, SaveButton } from './FormRows.jsx';
import useSettingsStore from '../../store/settingsStore.js';

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
  const activity = useDailyActivity();
  const { steps, water } = activity;
  const stepGoal = useSettingsStore((s) => s.stepGoal);
  const waterGoal = useSettingsStore((s) => s.waterGoal);
  const haptic = useHaptics();
  const [burst, setBurst] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [stepsText, setStepsText] = useState('');
  const [stepsError, setStepsError] = useState(null);

  // What today's totals were *before* this tap. The rings can only be a frame
  // behind the clock — useDailyActivity re-reads at midnight and on resume —
  // but if they are, the morning's first glass must not be measured against
  // last night's total (that used to play the goal fanfare at 7 am).
  const base = (field) => (activity.date === todayKey() ? activity[field] : 0);

  function celebrateGoal() {
    haptic('pr');
    playChime('goal');
    setBurst(true);
    setTimeout(() => setBurst(false), 1300);
  }

  function openSteps() {
    setStepsText(steps ? String(steps) : '');
    setStepsError(null);
    setStepsOpen(true);
  }

  async function saveSteps() {
    const { value, error } = readField('steps', stepsText);
    if (error) {
      setStepsError(error);
      haptic('tap');
      return;
    }
    const next = value ?? 0;
    if (crossedGoal(base('steps'), next, stepGoal)) celebrateGoal();
    else haptic('tap');
    await setSteps(next);
    setStepsOpen(false);
  }

  function addGlass() {
    const before = base('water');
    if (crossedGoal(before, before + 1, waterGoal)) celebrateGoal();
    addWater(1);
  }

  return (
    <div className="glass rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
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
          type="button"
          onClick={openSteps}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          <Footprints size={15} /> Set steps
        </button>
        <button
          type="button"
          onClick={() => addWater(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--color-ivory)' }}
          aria-label="Remove a glass"
        >
          <Minus size={15} style={{ color: 'var(--color-ash)' }} />
        </button>
        <button
          type="button"
          onClick={addGlass}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-sm font-medium"
          style={{ background: 'var(--color-sage)', color: 'var(--color-text-inverse)' }}
        >
          <Plus size={15} /> Glass
        </button>
      </div>

      {/* Its own sheet rather than the generic text prompt: that one is a
          textarea, which gets a letter keyboard, and the old handler ran
          parseInt over it — "8,000" became 8 steps. */}
      <Modal isOpen={stepsOpen} onClose={() => setStepsOpen(false)} title="Today's steps">
        <NumberRow
          label="Steps"
          icon={Footprints}
          iconColor="var(--color-gold)"
          inputMode="numeric"
          placeholder="0"
          value={stepsText}
          onChange={(v) => { setStepsText(v); setStepsError(null); }}
          error={stepsError}
        />
        <p className="mt-2 px-1 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Sets today's total — copy it from your phone or watch. "8,000" and "8k" both work ({rangeHint('steps')}).
        </p>
        <SaveButton onClick={saveSteps} enabled label="Set steps" />
      </Modal>
    </div>
  );
}
