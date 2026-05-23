import { useState } from 'react';
import OpusMark from '../logo/OpusMark.jsx';
import useUserStore from '../../store/userStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import { logBodyStat } from '../../utils/healthActions.js';
import { toKg, unitLabel } from '../../utils/units.js';

const SEXES = ['Male', 'Female', 'Other'];

export default function Onboarding() {
  const updateProfile = useUserStore((s) => s.updateProfile);
  const setBarWeight = useSettingsStore((s) => s.setBarWeight);
  const setUnit = useSettingsStore((s) => s.setUnit);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const [unit, setUnitLocal] = useState('kg');
  const [name, setName] = useState('');
  const [bodyweight, setBodyweight] = useState('');
  const [height, setHeight] = useState('');
  const [sex, setSex] = useState(null);
  const [age, setAge] = useState('');
  const [bar, setBar] = useState('20');

  const lbl = unitLabel(unit);

  async function begin() {
    setUnit(unit);
    const birthYear = age ? new Date().getFullYear() - Number(age) : null;
    await updateProfile({
      name: name.trim(),
      height: height ? Number(height) : null,
      sex,
      birthYear,
    });
    if (bodyweight) {
      await logBodyStat({ date: new Date().toISOString().slice(0, 10), weight: toKg(bodyweight, unit) });
    }
    setBarWeight(toKg(bar || 20, unit));
    completeOnboarding();
  }

  const field = { background: 'var(--color-stone)', color: 'var(--color-chalk)' };
  const lblCls = 'mt-4 block font-sans text-xs font-semibold uppercase tracking-widest';

  return (
    <div className="fixed inset-0 z-[55] flex flex-col items-center overflow-y-auto px-8 py-10" style={{ background: 'var(--color-obsidian)' }}>
      <OpusMark size={84} animate />
      <h1 className="mt-6 font-display text-4xl font-bold" style={{ color: 'var(--color-chalk)' }}>Welcome to OPUS</h1>
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
