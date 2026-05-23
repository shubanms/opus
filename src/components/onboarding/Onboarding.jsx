import { useState } from 'react';
import OpusMark from '../logo/OpusMark.jsx';
import useUserStore from '../../store/userStore.js';
import useSettingsStore from '../../store/settingsStore.js';

export default function Onboarding() {
  const updateProfile = useUserStore((s) => s.updateProfile);
  const setBarWeight = useSettingsStore((s) => s.setBarWeight);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const [name, setName] = useState('');
  const [bar, setBar] = useState('20');

  async function begin() {
    await updateProfile({ name: name.trim() });
    setBarWeight(Number(bar) || 20);
    completeOnboarding();
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex flex-col items-center justify-center px-8"
      style={{ background: 'var(--color-obsidian)' }}
    >
      <OpusMark size={96} animate />

      <h1 className="mt-8 font-display text-4xl font-bold" style={{ color: 'var(--color-chalk)' }}>
        Welcome to OPUS
      </h1>
      <p className="mt-1 mb-8 font-sans text-sm" style={{ color: 'var(--color-ash)' }}>
        Let's set up your character.
      </p>

      <div className="w-full max-w-xs">
        <label className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-ash)' }}>
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Athlete"
          className="mt-2 w-full rounded-xl px-4 py-3 font-sans text-sm outline-none"
          style={{ background: 'var(--color-stone)', color: 'var(--color-chalk)' }}
        />

        <label className="mt-5 block font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-ash)' }}>
          Barbell weight (kg)
        </label>
        <input
          value={bar}
          onChange={(e) => setBar(e.target.value)}
          type="number"
          inputMode="decimal"
          className="mt-2 w-full rounded-xl px-4 py-3 font-mono text-sm outline-none"
          style={{ background: 'var(--color-stone)', color: 'var(--color-chalk)' }}
        />

        <button
          onClick={begin}
          className="mt-8 w-full rounded-xl py-4 font-sans text-base font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          Begin
        </button>
      </div>
    </div>
  );
}
