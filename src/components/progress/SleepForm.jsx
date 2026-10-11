import { Star } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { SLEEP_FIELDS } from '../../utils/health.js';
import { useDayEntry } from '../../hooks/useDayEntry.js';
import { useTodayKey } from '../../hooks/useTodayKey.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import { DateRow, NumberRow, SaveButton } from './FormRows.jsx';

// Log or correct one night's sleep. Prefilled with the chosen day's entry, so
// coming back to add a star rating no longer wipes the hours.
export default function SleepForm({ isOpen, onClose, date: initialDate }) {
  const today = useTodayKey();
  const haptic = useHaptics();
  const entry = useDayEntry({ kind: 'sleep', isOpen, initialDate, fields: SLEEP_FIELDS });
  const quality = Number(entry.form.quality) || 0;

  function rate(n) {
    haptic('tap');
    // Tapping the current rating again clears it.
    entry.setField('quality', n === quality ? '' : String(n));
  }

  async function save() {
    if (!(await entry.save())) {
      haptic('tap');
      return;
    }
    haptic('success');
    playChime('success');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={entry.original ? 'Edit sleep' : 'Log sleep'}>
      <DateRow value={entry.date} max={today} onChange={entry.setDate} existing={!!entry.original} />
      <NumberRow
        label="Hours slept"
        unit="h"
        value={entry.form.hours}
        onChange={(v) => entry.setField('hours', v)}
        onBlur={() => entry.touch('hours')}
        error={entry.errors.hours}
      />

      <p className="mb-1 mt-4 font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>Quality</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => rate(n)}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            aria-pressed={n <= quality}
            className="flex h-11 w-11 items-center justify-center rounded-xl"
          >
            <Star
              size={28}
              fill={n <= quality ? 'var(--color-gold)' : 'none'}
              style={{ color: n <= quality ? 'var(--color-gold)' : 'var(--color-ash)', transition: 'color 160ms, fill 160ms' }}
            />
          </button>
        ))}
      </div>

      <SaveButton
        onClick={save}
        enabled={entry.changed || entry.hasErrors}
        label={entry.original ? 'Save changes' : 'Save'}
      />
    </Modal>
  );
}
