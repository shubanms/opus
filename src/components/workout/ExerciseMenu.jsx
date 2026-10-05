import { ArrowUp, ArrowDown, Info, Link2, Unlink, Repeat, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal.jsx';

/**
 * Everything you can do to an exercise card, as full-width rows.
 *
 * The card header carried six controls — two 16px chevrons, info, link, swap
 * and remove at 28px — which with chalky hands was a lottery, and squeezed
 * the exercise name until "Incline Bench Press" wrapped. The header now keeps
 * swap (the one you need mid-set, when the bench is taken) and this menu; the
 * rest live here, each a 48px row with its name written out.
 */
export default function ExerciseMenu({
  isOpen,
  onClose,
  name,
  canMoveUp,
  canMoveDown,
  canLink,
  linked,
  setCount = 0,
  onMoveUp,
  onMoveDown,
  onToggleSuperset,
  onInfo,
  onSwap,
  onRemove,
}) {
  // Close first, then act: the action may open a sheet of its own (swap,
  // info), and two bottom sheets should not be up at once.
  const run = (fn) => () => {
    onClose();
    fn?.();
  };

  const rows = [
    { key: 'info', label: 'Exercise info & coaching note', Icon: Info, on: onInfo },
    onSwap && { key: 'swap', label: setCount ? 'Swap — keeps the sets you logged' : 'Swap exercise', Icon: Repeat, on: onSwap },
    canLink && {
      key: 'link',
      label: linked ? 'Remove from superset' : 'Superset with the exercise above',
      Icon: linked ? Unlink : Link2,
      on: onToggleSuperset,
    },
    { key: 'up', label: 'Move up', Icon: ArrowUp, on: onMoveUp, disabled: !canMoveUp },
    { key: 'down', label: 'Move down', Icon: ArrowDown, on: onMoveDown, disabled: !canMoveDown },
    {
      key: 'remove',
      label: setCount ? `Remove exercise and its ${setCount} set${setCount === 1 ? '' : 's'}` : 'Remove exercise',
      Icon: Trash2,
      on: onRemove,
      danger: true,
    },
  ].filter(Boolean);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={name}>
      <div className="flex flex-col gap-1.5">
        {rows.map(({ key, label, Icon, on, disabled, danger }) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={run(on)}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-sans text-sm font-medium"
            style={{
              background: 'var(--color-ivory)',
              color: danger ? 'var(--color-ember)' : 'var(--color-text-primary)',
              opacity: disabled ? 0.35 : 1,
            }}
          >
            <Icon size={17} style={{ color: danger ? 'var(--color-ember)' : 'var(--color-gold)', flexShrink: 0 }} />
            {label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
