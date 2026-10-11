import Modal from '../ui/Modal.jsx';
import useSettingsStore from '../../store/settingsStore.js';
import { unitLabel } from '../../utils/units.js';
import { BODY_FIELDS, MEASUREMENTS, lengthUnit } from '../../utils/health.js';
import { useDayEntry } from '../../hooks/useDayEntry.js';
import { useTodayKey } from '../../hooks/useTodayKey.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import { DateRow, NumberRow, SaveButton } from './FormRows.jsx';

const LABEL = { weight: 'Weight', bodyFat: 'Body fat', chest: 'Chest', waist: 'Waist', hips: 'Hips', arms: 'Arms', thighs: 'Thighs' };

// Log or correct one day's body stats. Opens on `date` (today by default);
// the date picker moves it to any earlier day, prefilled with what that day
// already holds. Circumferences are stored in cm and shown in inches to
// anyone weighing in pounds.
export default function BodyStatsForm({ isOpen, onClose, date: initialDate }) {
  const unit = useSettingsStore((s) => s.unit);
  const today = useTodayKey();
  const haptic = useHaptics();
  const entry = useDayEntry({ kind: 'body', isOpen, initialDate, fields: BODY_FIELDS, unit });

  const unitOf = (f) => (f === 'weight' ? unitLabel(unit) : f === 'bodyFat' ? '%' : lengthUnit(unit));

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
    <Modal isOpen={isOpen} onClose={onClose} title={entry.original ? 'Edit body stats' : 'Log body stats'}>
      <DateRow value={entry.date} max={today} onChange={entry.setDate} existing={!!entry.original} />
      <div className="flex flex-col gap-2">
        {['weight', 'bodyFat'].map((f) => (
          <NumberRow
            key={f}
            label={LABEL[f]}
            unit={unitOf(f)}
            value={entry.form[f]}
            onChange={(v) => entry.setField(f, v)}
            onBlur={() => entry.touch(f)}
            error={entry.errors[f]}
          />
        ))}
        <p className="mt-2 font-sans text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
          Measurements
        </p>
        {MEASUREMENTS.map((f) => (
          <NumberRow
            key={f}
            label={LABEL[f]}
            unit={unitOf(f)}
            value={entry.form[f]}
            onChange={(v) => entry.setField(f, v)}
            onBlur={() => entry.touch(f)}
            error={entry.errors[f]}
          />
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
