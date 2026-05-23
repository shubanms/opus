import { useState } from 'react';
import { Star } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { logSleep } from '../../utils/healthActions.js';

export default function SleepForm({ isOpen, onClose }) {
  const [hours, setHours] = useState('');
  const [quality, setQuality] = useState(0);

  async function save() {
    await logSleep({
      date: new Date().toISOString().slice(0, 10),
      hours: hours === '' ? null : Number(hours),
      quality,
    });
    setHours('');
    setQuality(0);
    onClose();
  }

  const canSave = hours !== '' || quality > 0;

  return (
    <Modal isOpen={isOpen} onClose={() => { setHours(''); setQuality(0); onClose(); }} title="Log sleep">
      <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--color-ivory)' }}>
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>Hours slept</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="—"
            className="w-20 rounded-lg px-2 py-1.5 text-right font-mono text-sm outline-none"
            style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}
          />
          <span className="w-6 font-sans text-xs" style={{ color: 'var(--color-ash)' }}>h</span>
        </div>
      </div>

      <p className="mb-2 mt-4 font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>Quality</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setQuality(n)} aria-label={`${n} stars`}>
            <Star
              size={28}
              fill={n <= quality ? 'var(--color-gold)' : 'none'}
              style={{ color: n <= quality ? 'var(--color-gold)' : 'var(--color-ash)' }}
            />
          </button>
        ))}
      </div>

      <button
        onClick={save}
        disabled={!canSave}
        className="mt-5 w-full rounded-xl py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: canSave ? 1 : 0.35 }}
      >
        Save
      </button>
    </Modal>
  );
}
