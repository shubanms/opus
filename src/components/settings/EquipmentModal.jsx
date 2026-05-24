import { useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { PLATES_KG, PLATES_LB } from '../../utils/plateCalc.js';
import { togglePlate, effectivePlates } from '../../utils/inventory.js';
import useSettingsStore from '../../store/settingsStore.js';
import { toDisplay, toKg, unitLabel } from '../../utils/units.js';

const LOCATIONS = [
  { key: 'gym', label: 'Gym' },
  { key: 'home', label: 'Home' },
];

export default function EquipmentModal({ isOpen, onClose }) {
  const unit = useSettingsStore((s) => s.unit);
  const barWeight = useSettingsStore((s) => s.barWeight);
  const inventory = useSettingsStore((s) => s.inventory);
  const setInventoryActive = useSettingsStore((s) => s.setInventoryActive);
  const setInventoryBar = useSettingsStore((s) => s.setInventoryBar);
  const setInventoryPlates = useSettingsStore((s) => s.setInventoryPlates);
  const [custom, setCustom] = useState('');

  const loc = inventory.active;
  const data = inventory[loc] ?? {};
  const standard = unit === 'lbs' ? PLATES_LB : PLATES_KG;
  const owned = effectivePlates(data, unit, standard);
  const chips = [...new Set([...standard, ...owned])].sort((a, b) => b - a);
  const u = unitLabel(unit);

  function toggle(size) {
    setInventoryPlates(loc, togglePlate(owned, size), unit);
  }
  function addCustom() {
    const v = Number(custom);
    if (v > 0 && !owned.includes(v)) setInventoryPlates(loc, togglePlate(owned, v), unit);
    setCustom('');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Equipment & plates">
      {/* Location */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--color-ivory)' }}>
        {LOCATIONS.map((l) => (
          <button
            key={l.key}
            onClick={() => setInventoryActive(l.key)}
            className="flex-1 rounded-lg py-2 font-sans text-xs font-medium"
            style={{ background: loc === l.key ? 'var(--color-chalk)' : 'transparent', color: loc === l.key ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Bar weight for this location */}
      <div className="mt-4 flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--color-ivory)' }}>
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>Bar weight ({u})</span>
        <input
          key={`${loc}-${unit}-${data.barKg ?? 'def'}`}
          defaultValue={toDisplay(data.barKg ?? barWeight, unit)}
          onBlur={(e) => setInventoryBar(loc, toKg(Number(e.target.value) || 0, unit))}
          type="number" inputMode="decimal"
          className="w-24 rounded-lg px-2 py-1.5 text-right font-mono text-sm outline-none"
          style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}
        />
      </div>

      {/* Owned plates */}
      <p className="mb-2 mt-4 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Plates you own ({u}, per side)
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((size) => {
          const on = owned.includes(size);
          return (
            <button
              key={size}
              onClick={() => toggle(size)}
              className="rounded-full px-3 py-1.5 font-mono text-xs font-medium"
              style={{ background: on ? 'var(--color-gold)' : 'var(--color-ivory)', color: on ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}
            >
              {size}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          placeholder={`Add a plate (${u})`}
          type="number" inputMode="decimal"
          className="flex-1 rounded-lg px-3 py-2 font-mono text-sm outline-none"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        />
        <button onClick={addCustom} className="flex items-center gap-1 rounded-lg px-3 font-sans text-sm font-medium" style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}>
          <Plus size={15} /> Add
        </button>
      </div>

      <p className="mt-4 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        The plate calculator uses the active location's bar and plates to show what's loadable.
      </p>
    </Modal>
  );
}
