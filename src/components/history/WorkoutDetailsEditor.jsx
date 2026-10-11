import ColorPicker from '../ui/ColorPicker.jsx';
import useUIStore from '../../store/uiStore.js';
import { setWorkoutColor, setWorkoutName, setWorkoutNote, setWorkoutTags } from '../../utils/noteActions.js';
import { moveWorkoutDate } from '../../utils/workoutActions.js';
import { friendlyDate, todayKey } from '../../utils/dateKey.js';
import { playChime } from '../../utils/sound.js';

// Friendly muscle-group tags a user can attach to a past session.
export const MUSCLE_TAGS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body'];

const label = 'mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-wide';
const field = { background: 'var(--color-ivory)', color: 'var(--color-text-primary)' };

// The session's own details — name, day, tags, colour, note — behind a
// disclosure, because they are edited rarely and the sets are what people
// open a card to read.
export default function WorkoutDetailsEditor({ workout }) {
  const tags = workout.tags ?? [];

  function toggleTag(tag) {
    setWorkoutTags(workout.id, tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);
  }

  // A session logged on the wrong day (finished after midnight, or entered
  // the next morning) moves with its sets and records, and the streak follows.
  async function moveTo(key) {
    if (!key || key === workout.date) return;
    const res = await moveWorkoutDate(workout.id, key);
    if (!res) {
      useUIStore.getState().showToast('A session can only move to today or earlier.', { type: 'error' });
      return;
    }
    playChime('tap');
    useUIStore.getState().showToast(`Moved to ${friendlyDate(key)}`, {
      type: 'success',
      action: {
        label: 'Undo',
        onAction: async () => {
          await moveWorkoutDate(workout.id, res.from, { restore: res.derived });
          useUIStore.getState().showToast(`Back on ${friendlyDate(res.from)}`, { type: 'success' });
        },
      },
    });
  }

  return (
    <div className="pt-3">
      <label className={label} style={{ color: 'var(--color-ash)' }} htmlFor={`w-name-${workout.id}`}>Name</label>
      <input
        id={`w-name-${workout.id}`}
        key={workout.name}
        defaultValue={workout.name}
        onBlur={(e) => setWorkoutName(workout.id, e.target.value)}
        className="mb-3 w-full rounded-xl px-3 py-2.5 font-sans text-sm outline-none"
        style={field}
      />

      <label className={label} style={{ color: 'var(--color-ash)' }} htmlFor={`w-date-${workout.id}`}>Day</label>
      <input
        id={`w-date-${workout.id}`}
        key={workout.date}
        type="date"
        defaultValue={workout.date}
        max={todayKey()}
        onChange={(e) => moveTo(e.target.value)}
        className="mb-3 w-full rounded-xl px-3 py-2.5 font-sans text-sm outline-none"
        // The native picker's own icon follows the theme.
        style={{ ...field, colorScheme: 'light dark' }}
      />

      <span className={label} style={{ color: 'var(--color-ash)' }}>Tags</span>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {MUSCLE_TAGS.map((t) => {
          const on = tags.includes(t);
          return (
            <button
              type="button"
              key={t}
              onClick={() => toggleTag(t)}
              aria-pressed={on}
              className="min-h-[32px] rounded-full px-3 py-1 font-sans text-xs font-medium"
              style={{ background: on ? 'var(--color-gold)' : 'var(--color-ivory)', color: on ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}
            >
              {t}
            </button>
          );
        })}
      </div>

      <span className={label} style={{ color: 'var(--color-ash)' }}>Colour</span>
      <div className="mb-3">
        <ColorPicker value={workout.color ?? null} onChange={(c) => setWorkoutColor(workout.id, c)} />
      </div>

      <label className={label} style={{ color: 'var(--color-ash)' }} htmlFor={`w-note-${workout.id}`}>Note</label>
      <textarea
        id={`w-note-${workout.id}`}
        key={workout.notes}
        defaultValue={workout.notes ?? ''}
        onBlur={(e) => setWorkoutNote(workout.id, e.target.value)}
        placeholder="How did it go?"
        rows={2}
        className="w-full resize-none rounded-xl px-3 py-2 font-sans text-sm outline-none"
        style={field}
      />
    </div>
  );
}
