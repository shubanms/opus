import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { logBodyStat } from '../../utils/healthActions.js';

const FIELDS = [
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'bodyFat', label: 'Body fat', unit: '%' },
  { key: 'chest', label: 'Chest', unit: 'cm' },
  { key: 'waist', label: 'Waist', unit: 'cm' },
  { key: 'hips', label: 'Hips', unit: 'cm' },
  { key: 'arms', label: 'Arms', unit: 'cm' },
  { key: 'thighs', label: 'Thighs', unit: 'cm' },
];

export default function BodyStatsForm({ isOpen, onClose }) {
  const [vals, setVals] = useState({});

  async function save() {
    const entry = { date: new Date().toISOString().slice(0, 10) };
    for (const f of FIELDS) {
      if (vals[f.key] !== undefined && vals[f.key] !== '') entry[f.key] = Number(vals[f.key]);
    }
    await logBodyStat(entry);
    setVals({});
    onClose();
  }

  const canSave = Object.values(vals).some((v) => v !== '' && v != null);

  return (
    <Modal isOpen={isOpen} onClose={() => { setVals({}); onClose(); }} title="Log body stats">
      <div className="flex flex-col gap-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--color-ivory)' }}>
            <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>{f.label}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={vals[f.key] ?? ''}
                onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder="—"
                className="w-20 rounded-lg px-2 py-1.5 text-right font-mono text-sm outline-none"
                style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}
              />
              <span className="w-6 font-sans text-xs" style={{ color: 'var(--color-ash)' }}>{f.unit}</span>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={save}
        disabled={!canSave}
        className="mt-4 w-full rounded-xl py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: canSave ? 1 : 0.35 }}
      >
        Save today's entry
      </button>
    </Modal>
  );
}
