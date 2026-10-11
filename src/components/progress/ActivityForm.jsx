import { Footprints, Droplet } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { ACTIVITY_FIELDS } from '../../utils/health.js';
import { useDayEntry } from '../../hooks/useDayEntry.js';
import { useTodayKey } from '../../hooks/useTodayKey.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import { DateRow, NumberRow, SaveButton } from './FormRows.jsx';

// Add or correct a single day's steps + water. Opens on `date` (today by
// default) prefilled with that day's row; a blank field is left as it was
// rather than saved as zero. Steps take "8,000" or "8k" from a number pad.
export default function ActivityForm({ isOpen, onClose, date: initialDate }) {
  const today = useTodayKey();
  const haptic = useHaptics();
  const entry = useDayEntry({ kind: 'activity', isOpen, initialDate, fields: ACTIVITY_FIELDS });

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
    <Modal isOpen={isOpen} onClose={onClose} title={entry.original ? 'Edit activity' : 'Log activity'}>
      <DateRow value={entry.date} max={today} onChange={entry.setDate} existing={!!entry.original} />
      <div className="flex flex-col gap-2">
        <NumberRow
          label="Steps"
          icon={Footprints}
          iconColor="var(--color-gold)"
          inputMode="numeric"
          placeholder="0"
          value={entry.form.steps}
          onChange={(v) => entry.setField('steps', v)}
          onBlur={() => entry.touch('steps')}
          error={entry.errors.steps}
        />
        <NumberRow
          label="Water (glasses)"
          icon={Droplet}
          iconColor="var(--color-sage)"
          inputMode="numeric"
          placeholder="0"
          value={entry.form.water}
          onChange={(v) => entry.setField('water', v)}
          onBlur={() => entry.touch('water')}
          error={entry.errors.water}
        />
      </div>
      <SaveButton
        onClick={save}
        enabled={entry.changed || entry.hasErrors}
        label={entry.original ? 'Save changes' : 'Save'}
      />
    </Modal>
  );
}
