import { m, TWEEN } from '../../motion/index.jsx';

// An empty screen with the way out of it.
//
// The app's empty states described the situation and stopped there — "No
// workouts yet. Complete your first session to see it here." That is a dead end
// with a button-shaped hole in it: it names the action and then makes you go
// find it. Every empty state that has an obvious next step should offer it.

export default function EmptyState({ icon: Icon, title, body, actionLabel, onAction }) {
  return (
    <m.div
      className="flex flex-col items-center px-6 py-12 text-center"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TWEEN.enter}
    >
      {Icon && (
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'var(--color-ivory)' }}
        >
          <Icon size={24} style={{ color: 'var(--color-ash)' }} />
        </div>
      )}

      <p className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </p>

      {body && (
        <p
          className="mt-2 max-w-xs font-sans text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {body}
        </p>
      )}

      {actionLabel && onAction && (
        <m.button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-2xl px-6 py-3 font-sans text-sm font-semibold"
          style={{
            background: 'var(--grad-accent)',
            color: 'var(--color-obsidian)',
            boxShadow: 'var(--glow-accent)',
          }}
          whileTap={{ scale: 0.96 }}
        >
          {actionLabel}
        </m.button>
      )}
    </m.div>
  );
}
