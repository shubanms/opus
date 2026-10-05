import { Play, Pencil, Trash2, Copy, Shuffle, TrendingUp } from 'lucide-react';
import useSettingsStore from '../../store/settingsStore.js';
import { stepLabel } from '../../utils/progression.js';
import { friendlyDate } from '../../utils/dateKey.js';
import { DAY_SHORT } from '../../utils/routineDays.js';

const MUSCLE_HUE = {
  chest: '#FF8FA3', triceps: '#FF8FA3', 'front-deltoids': '#FF8FA3',
  biceps: '#8B7DFF', forearm: '#8B7DFF', abs: '#8B7DFF', obliques: '#8B7DFF',
  'upper-back': '#4FD8C4', 'lower-back': '#4FD8C4', trapezius: '#4FD8C4', 'back-deltoids': '#4FD8C4',
  quadriceps: '#7B83A6', hamstring: '#7B83A6', gluteal: '#7B83A6', calves: '#7B83A6',
};

// "Last done 28 Sep" / "Last done today".
function lastDoneLabel(key) {
  const f = friendlyDate(key);
  if (!f) return null;
  return `Last done ${f === 'Today' || f === 'Yesterday' ? f.toLowerCase() : f}`;
}

/**
 * A routine in a list. `showDay` is false for a routine whose weekday a newer
 * routine has taken (data from before one-routine-per-day), so two cards never
 * both claim Monday.
 */
export default function TemplateCard({ template, onStart, onEdit, onDelete, onDuplicate, onShuffle, onRename, stale, busy = false, showDay = true }) {
  const unit = useSettingsStore((s) => s.unit);
  const name = template.name || 'Routine';
  const muscleGroups = [...new Set(template.exercises.map((e) => e.muscleGroup))].slice(0, 4);
  const scheme = template.progression;
  const auto = scheme?.mode === 'linear' || scheme?.mode === 'double';
  // Lifts that missed their target last time (linear mode counts toward a deload).
  const missed = auto ? template.exercises.filter((e) => (e.misses ?? 0) > 0) : [];
  const deloadAt = scheme?.deloadAfterMisses ?? 2;
  const lastDone = template.lastDone ? lastDoneLabel(template.lastDone) : null;
  const iconBtn = 'flex h-8 w-8 items-center justify-center rounded-full';

  return (
    <div
      className="glass mb-3 rounded-2xl px-4 py-3"
      style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {template.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: template.color }} />}
            {onRename ? (
              <button type="button" onClick={() => onRename(template)} className="line-clamp-2 min-h-8 min-w-0 break-words text-left font-sans text-base font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }} aria-label={`Rename ${name}`}>
                {name}
              </button>
            ) : (
              <p className="line-clamp-2 min-w-0 break-words font-sans text-base font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                {name}
              </p>
            )}
            {showDay && template.dayOfWeek != null && (
              <span className="shrink-0 rounded-full px-2 py-0.5 font-sans text-xs" style={{ background: 'var(--color-ivory)', color: 'var(--color-text-secondary)' }}>
                {DAY_SHORT[template.dayOfWeek]}
              </span>
            )}
          </div>
        </div>

        <div className="ml-2 flex shrink-0 gap-1.5">
          {onShuffle && (
            <button type="button" onClick={() => onShuffle(template)} disabled={busy} className={iconBtn} style={{ background: 'var(--color-ivory)', opacity: busy ? 0.5 : 1 }} aria-label={`Shuffle ${name}`}>
              <Shuffle size={13} style={{ color: 'var(--color-ash)' }} />
            </button>
          )}
          {onDuplicate && (
            <button type="button" onClick={() => onDuplicate(template)} disabled={busy} className={iconBtn} style={{ background: 'var(--color-ivory)', opacity: busy ? 0.5 : 1 }} aria-label={`Duplicate ${name}`}>
              <Copy size={13} style={{ color: 'var(--color-ash)' }} />
            </button>
          )}
          {onEdit && (
            <button type="button" onClick={() => onEdit(template)} className={iconBtn} style={{ background: 'var(--color-ivory)' }} aria-label={`Edit ${name}`}>
              <Pencil size={13} style={{ color: 'var(--color-ash)' }} />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={() => onDelete(template)} className={iconBtn} style={{ background: 'var(--color-ivory)' }} aria-label={`Delete ${name}`}>
              <Trash2 size={13} style={{ color: 'var(--color-ash)' }} />
            </button>
          )}
          {onStart && (
            <button type="button" onClick={() => onStart(template)} className={iconBtn} style={{ background: 'var(--color-gold)' }} aria-label={`Start ${name}`}>
              <Play size={13} fill="var(--color-obsidian)" style={{ color: 'var(--color-obsidian)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Full width, under the actions: beside them it truncated to "Last done …". */}
      <p className="-mt-1 truncate font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {template.exercises.length} exercise{template.exercises.length === 1 ? '' : 's'}
        {lastDone && <> · {lastDone}</>}
      </p>

      {(auto || muscleGroups.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {auto && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-xs font-medium"
              style={{ background: 'var(--color-ivory)', color: 'var(--color-gold)' }}
              title={scheme.mode === 'linear' ? `Linear progression — deloads after ${deloadAt} misses in a row` : 'Double progression — holds on a miss'}
            >
              <TrendingUp size={11} /> Auto {stepLabel(scheme.weightStep, unit)}
            </span>
          )}
          {muscleGroups.map((m) => {
            const hue = MUSCLE_HUE[m] ?? '#7B83A6';
            return (
              <span key={m} className="rounded-full px-2 py-0.5 font-sans text-xs capitalize" style={{ background: `${hue}22`, color: hue }}>
                {m.replace(/-/g, ' ')}
              </span>
            );
          })}
        </div>
      )}

      {missed.length > 0 && (
        <p className="mt-2 truncate font-sans text-xs" style={{ color: 'var(--color-ember)' }}>
          Missed last time: {missed.map((e) => (scheme.mode === 'linear' ? `${e.name} (${e.misses}/${deloadAt})` : e.name)).join(', ')}
        </p>
      )}

      {stale && onShuffle && (
        <button
          type="button"
          onClick={() => onShuffle(template)}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 font-sans text-xs font-medium"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          <Shuffle size={13} /> You've run this a while — shuffle it up?
        </button>
      )}
    </div>
  );
}
