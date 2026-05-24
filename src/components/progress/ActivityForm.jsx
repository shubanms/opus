import { useState, useEffect } from 'react';
import { Footprints, Droplet } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { logActivity } from '../../utils/healthActions.js';

// Add or edit a single day's steps + water. Editing keeps the date fixed
// (the daily log is keyed by date); adding defaults to today but any past
// date can be backfilled.
export default function ActivityForm({ isOpen, entry, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [steps, setSteps] = useState('');
  const [water, setWater] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDate(entry?.date ?? today);
    setSteps(entry?.steps != null ? String(entry.steps) : '');
    setWater(entry?.water != null ? String(entry.water) : '');
  }, [isOpen, entry]); // eslint-disable-line react-hooks/exhaustive-deps

  const editing = !!entry;

  async function save() {
    await logActivity({
      date,
      steps: steps === '' ? 0 : Math.max(0, parseInt(steps) || 0),
      water: water === '' ? 0 : Math.max(0, parseInt(water) || 0),
    });
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit activity' : 'Log activity'}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--color-ivory)' }}>
          <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>Date</span>
          <input
            type="date"
            value={date}
            max={today}
            disabled={editing}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg px-2 py-1.5 font-mono text-sm outline-none"
            style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)', opacity: editing ? 0.6 : 1 }}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--color-ivory)' }}>
          <span className="flex items-center gap-2 font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <Footprints size={15} style={{ color: 'var(--color-gold)' }} /> Steps
          </span>
          <input
            type="number" inputMode="numeric"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="0"
            className="w-24 rounded-lg px-2 py-1.5 text-right font-mono text-sm outline-none"
            style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--color-ivory)' }}>
          <span className="flex items-center gap-2 font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <Droplet size={15} style={{ color: 'var(--color-sage)' }} /> Water (glasses)
          </span>
          <input
            type="number" inputMode="numeric"
            value={water}
            onChange={(e) => setWater(e.target.value)}
            placeholder="0"
            className="w-24 rounded-lg px-2 py-1.5 text-right font-mono text-sm outline-none"
            style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}
          />
        </div>
      </div>

      <button
        onClick={save}
        className="mt-4 w-full rounded-xl py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
      >
        {editing ? 'Save changes' : 'Save'}
      </button>
    </Modal>
  );
}
