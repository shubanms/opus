import { useState } from 'react';
import OpusMark from '../logo/OpusMark.jsx';
import useUserStore from '../../store/userStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import { logBodyStat } from '../../utils/healthActions.js';
import { toKg, unitLabel } from '../../utils/units.js';
import { useExercises } from '../../hooks/useExercises.js';
import { createTemplate } from '../../utils/templateActions.js';
import { makeRng } from '../../utils/routineGenerator.js';
import { planWeek, SPLIT_LIST } from '../../utils/weekPlanner.js';

const SEXES = ['Male', 'Female', 'Other'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const toAppDow = (d) => (d === 7 ? 0 : d); // planner 1=Mon…7=Sun → app 0=Sun…6=Sat

export default function Onboarding() {
  const updateProfile = useUserStore((s) => s.updateProfile);
  const setBarWeight = useSettingsStore((s) => s.setBarWeight);
  const setUnit = useSettingsStore((s) => s.setUnit);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const allExercises = useExercises();

  const [step, setStep] = useState(0);
  const [unit, setUnitLocal] = useState('kg');
  const [name, setName] = useState('');
  const [bodyweight, setBodyweight] = useState('');
  const [height, setHeight] = useState('');
  const [sex, setSex] = useState(null);
  const [age, setAge] = useState('');
  const [bar, setBar] = useState('20');

  // Week-plan step
  const [splitKey, setSplitKey] = useState('ppl');
  const [days, setDays] = useState(6);
  const [level, setLevel] = useState('intermediate');
  const [busy, setBusy] = useState(false);
  const split = SPLIT_LIST.find((s) => s.key === splitKey);

  const lbl = unitLabel(unit);

  async function saveProfile() {
    setUnit(unit);
    const birthYear = age ? new Date().getFullYear() - Number(age) : null;
    await updateProfile({ name: name.trim(), height: height ? Number(height) : null, sex, birthYear });
    if (bodyweight) {
      await logBodyStat({ date: new Date().toISOString().slice(0, 10), weight: toKg(bodyweight, unit) });
    }
    setBarWeight(toKg(bar || 20, unit));
  }

  async function begin() {
    await saveProfile();
    setStep(1); // move to the optional "plan your week" step
  }

  function pickSplit(key) {
    const s = SPLIT_LIST.find((x) => x.key === key);
    setSplitKey(key);
    if (s && !s.days.includes(days)) setDays(s.days[s.days.length - 1]);
  }

  async function createWeek() {
    if (busy) return;
    setBusy(true);
    try {
      const week = planWeek({ split: splitKey, days, level, sessionMinutes: 60, rest: 'standard', exercises: allExercises, rng: makeRng(Date.now()) });
      for (const day of week) {
        await createTemplate({ name: day.name, dayOfWeek: toAppDow(day.dayOfWeek), autoKey: day.autoKey, exercises: day.exercises });
      }
      completeOnboarding();
    } finally {
      setBusy(false);
    }
  }

  const field = { background: 'var(--color-stone)', color: 'var(--color-text-inverse)' };
  const lblCls = 'mt-4 block font-sans text-xs font-semibold uppercase tracking-widest';

  if (step === 1) {
    return (
      <div className="fixed inset-0 z-[55] flex flex-col items-center overflow-y-auto px-8 py-10" style={{ background: 'var(--color-obsidian)' }}>
        <OpusMark size={72} animate />
        <h1 className="mt-6 font-display text-3xl font-bold" style={{ color: 'var(--color-text-inverse)' }}>Plan your week</h1>
        <p className="mt-1 mb-6 max-w-xs text-center font-sans text-sm" style={{ color: 'var(--color-ash)' }}>
          Pick a split and we'll build a full week of routines — fully editable after.
        </p>
        <div className="w-full max-w-xs">
          <div className="flex flex-col gap-2">
            {SPLIT_LIST.map((s) => {
              const on = s.key === splitKey;
              return (
                <button key={s.key} onClick={() => pickSplit(s.key)} className="rounded-xl border px-4 py-3 text-left"
                  style={{ borderColor: on ? 'var(--color-gold)' : 'transparent', background: 'var(--color-stone)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-sm font-semibold" style={{ color: 'var(--color-text-inverse)' }}>{s.label}</span>
                    <span className="font-mono text-xs" style={{ color: 'var(--color-ash)' }}>{s.days.join('/')}d</span>
                  </div>
                  <p className="mt-0.5 font-sans text-xs" style={{ color: 'var(--color-ash)' }}>{s.blurb}</p>
                </button>
              );
            })}
          </div>

          <span className={lblCls} style={{ color: 'var(--color-ash)', display: 'block' }}>Days per week</span>
          <div className="mt-2 flex gap-1 rounded-xl p-1" style={{ background: 'var(--color-stone)' }}>
            {split.days.map((d) => (
              <button key={d} onClick={() => setDays(d)} className="flex-1 rounded-lg py-2 font-sans text-xs font-medium"
                style={{ background: days === d ? 'var(--color-gold)' : 'transparent', color: days === d ? 'var(--color-obsidian)' : 'var(--color-ash)' }}>
                {d} days
              </button>
            ))}
          </div>

          <span className={lblCls} style={{ color: 'var(--color-ash)', display: 'block' }}>Experience</span>
          <div className="mt-2 flex gap-1 rounded-xl p-1" style={{ background: 'var(--color-stone)' }}>
            {LEVELS.map((l) => (
              <button key={l} onClick={() => setLevel(l)} className="flex-1 rounded-lg py-2 font-sans text-xs font-medium capitalize"
                style={{ background: level === l ? 'var(--color-gold)' : 'transparent', color: level === l ? 'var(--color-obsidian)' : 'var(--color-ash)' }}>
                {l}
              </button>
            ))}
          </div>

          <button onClick={createWeek} disabled={busy} className="mt-8 w-full rounded-xl py-4 font-sans text-base font-semibold"
            style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: busy ? 0.5 : 1 }}>
            Create my week
          </button>
          <button onClick={completeOnboarding} className="mt-2 mb-4 w-full py-2 font-sans text-sm font-medium" style={{ color: 'var(--color-ash)' }}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[55] flex flex-col items-center overflow-y-auto px-8 py-10" style={{ background: 'var(--color-obsidian)' }}>
      <OpusMark size={84} animate />
      <h1 className="mt-6 font-display text-4xl font-bold" style={{ color: 'var(--color-text-inverse)' }}>Welcome to OPUS</h1>
      <p className="mt-1 mb-6 font-sans text-sm" style={{ color: 'var(--color-ash)' }}>Set up your character.</p>

      <div className="w-full max-w-xs">
        {/* Units */}
        <span className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-ash)' }}>Units</span>
        <div className="mt-2 flex overflow-hidden rounded-xl" style={{ background: 'var(--color-stone)' }}>
          {['kg', 'lbs'].map((u) => (
            <button key={u} onClick={() => setUnitLocal(u)} className="flex-1 py-2.5 font-sans text-sm font-medium"
              style={{ background: unit === u ? 'var(--color-gold)' : 'transparent', color: unit === u ? 'var(--color-obsidian)' : 'var(--color-ash)' }}>
              {u}
            </button>
          ))}
        </div>

        <label className={lblCls} style={{ color: 'var(--color-ash)' }}>Your name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Athlete"
          className="mt-2 w-full rounded-xl px-4 py-3 font-sans text-sm outline-none" style={field} />

        <div className="flex gap-3">
          <div className="flex-1">
            <label className={lblCls} style={{ color: 'var(--color-ash)' }}>Bodyweight ({lbl})</label>
            <input value={bodyweight} onChange={(e) => setBodyweight(e.target.value)} type="number" inputMode="decimal"
              className="mt-2 w-full rounded-xl px-4 py-3 font-mono text-sm outline-none" style={field} />
          </div>
          <div className="flex-1">
            <label className={lblCls} style={{ color: 'var(--color-ash)' }}>Height (cm)</label>
            <input value={height} onChange={(e) => setHeight(e.target.value)} type="number" inputMode="decimal"
              className="mt-2 w-full rounded-xl px-4 py-3 font-mono text-sm outline-none" style={field} />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className={lblCls} style={{ color: 'var(--color-ash)' }}>Age</label>
            <input value={age} onChange={(e) => setAge(e.target.value)} type="number" inputMode="numeric"
              className="mt-2 w-full rounded-xl px-4 py-3 font-mono text-sm outline-none" style={field} />
          </div>
          <div className="flex-1">
            <label className={lblCls} style={{ color: 'var(--color-ash)' }}>Sex</label>
            <div className="mt-2 flex gap-1">
              {SEXES.map((s) => (
                <button key={s} onClick={() => setSex(s)} className="flex-1 rounded-lg py-2 font-sans text-xs"
                  style={{ background: sex === s ? 'var(--color-gold)' : 'var(--color-stone)', color: sex === s ? 'var(--color-obsidian)' : 'var(--color-ash)' }}>
                  {s[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className={lblCls} style={{ color: 'var(--color-ash)' }}>Empty barbell weight ({lbl}) — for plate math</label>
        <input value={bar} onChange={(e) => setBar(e.target.value)} type="number" inputMode="decimal"
          className="mt-2 w-full rounded-xl px-4 py-3 font-mono text-sm outline-none" style={field} />

        <button onClick={begin} className="mt-8 mb-4 w-full rounded-xl py-4 font-sans text-base font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}>
          Begin
        </button>
      </div>
    </div>
  );
}
