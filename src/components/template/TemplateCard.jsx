import { Play, Pencil, Trash2, Copy, Shuffle } from 'lucide-react';

const DAY_LABEL = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

const MUSCLE_HUE = {
  chest: '#FF8FA3', triceps: '#FF8FA3', 'front-deltoids': '#FF8FA3',
  biceps: '#8B7DFF', forearm: '#8B7DFF', abs: '#8B7DFF', obliques: '#8B7DFF',
  'upper-back': '#4FD8C4', 'lower-back': '#4FD8C4', trapezius: '#4FD8C4', 'back-deltoids': '#4FD8C4',
  quadriceps: '#7B83A6', hamstring: '#7B83A6', gluteal: '#7B83A6', calves: '#7B83A6',
};

export default function TemplateCard({ template, onStart, onEdit, onDelete, onDuplicate, onShuffle, onRename, stale }) {
  const muscleGroups = [...new Set(template.exercises.map((e) => e.muscleGroup))].slice(0, 4);

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
              <button onClick={() => onRename(template)} className="min-w-0 truncate text-left font-sans text-base font-semibold" style={{ color: 'var(--color-text-primary)' }} aria-label="Rename routine">
                {template.name}
              </button>
            ) : (
              <p className="truncate font-sans text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {template.name}
              </p>
            )}
            {template.dayOfWeek != null && (
              <span className="shrink-0 rounded-full px-2 py-0.5 font-sans text-xs" style={{ background: 'var(--color-ivory)', color: 'var(--color-text-secondary)' }}>
                {DAY_LABEL[template.dayOfWeek]}
              </span>
            )}
          </div>
          <p className="mt-0.5 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {template.exercises.length} exercise{template.exercises.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="ml-2 flex shrink-0 gap-1.5">
          {onShuffle && (
            <button onClick={() => onShuffle(template)} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--color-ivory)' }} aria-label="Shuffle exercises">
              <Shuffle size={13} style={{ color: 'var(--color-ash)' }} />
            </button>
          )}
          {onDuplicate && (
            <button onClick={() => onDuplicate(template)} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--color-ivory)' }} aria-label="Duplicate routine">
              <Copy size={13} style={{ color: 'var(--color-ash)' }} />
            </button>
          )}
          {onEdit && (
            <button onClick={() => onEdit(template)} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--color-ivory)' }} aria-label="Edit routine">
              <Pencil size={13} style={{ color: 'var(--color-ash)' }} />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(template)} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--color-ivory)' }} aria-label="Delete routine">
              <Trash2 size={13} style={{ color: 'var(--color-ash)' }} />
            </button>
          )}
          {onStart && (
            <button onClick={() => onStart(template)} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--color-gold)' }} aria-label="Start routine">
              <Play size={13} fill="var(--color-obsidian)" style={{ color: 'var(--color-obsidian)' }} />
            </button>
          )}
        </div>
      </div>

      {muscleGroups.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
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

      {stale && onShuffle && (
        <button
          onClick={() => onShuffle(template)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 font-sans text-xs font-medium"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          <Shuffle size={13} /> You've run this a while — shuffle it up?
        </button>
      )}
    </div>
  );
}
