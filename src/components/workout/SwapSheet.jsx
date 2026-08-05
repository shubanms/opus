import { Repeat, Search } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { useExercises } from '../../hooks/useExercises.js';
import { rankAlternatives } from '../../utils/exerciseSwap.js';
import { MUSCLE_LABEL } from '../../utils/muscleTargets.js';
import { m, itemVariants, listVariants } from '../../motion/index.jsx';

// Alternatives for an exercise you cannot do right now.
//
// Swapping used to open the full catalogue and leave you to search it, which is
// backwards: the moment you need a swap is the moment someone is on the bench
// and you want to keep moving. Browsing everything is still one tap away, but
// it is the escape hatch rather than the front door.

export default function SwapSheet({ isOpen, currentId, exclude = [], onSelect, onBrowseAll, onClose }) {
  const catalogue = useExercises();
  const current = currentId != null ? (catalogue ?? []).find((e) => e.id === currentId) : null;
  const alternatives = rankAlternatives(current, catalogue ?? [], { exclude });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={current ? `Swap ${current.name}` : 'Swap exercise'}>
      <p className="mb-3 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {current?.muscleGroup
          ? `Other ways to train ${MUSCLE_LABEL[current.muscleGroup] ?? current.muscleGroup}, different equipment first.`
          : 'Pick a replacement.'}
      </p>

      {alternatives.length === 0 ? (
        <p className="py-6 text-center font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Nothing else in the catalogue trains this muscle — browse all to pick anything.
        </p>
      ) : (
        <m.div className="flex flex-col gap-2" variants={listVariants} initial="initial" animate="animate">
          {alternatives.map((ex) => (
            <m.button
              key={ex.id}
              type="button"
              variants={itemVariants}
              onClick={() => onSelect?.(ex)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left"
              style={{ background: 'var(--color-ivory)' }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'var(--accent-wash)' }}
              >
                <Repeat size={15} style={{ color: 'var(--color-gold)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-sans text-sm font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {ex.name}
                </p>
                <p className="font-sans text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                  {ex.equipment ?? 'other'}
                  {ex.equipment && ex.equipment !== current?.equipment ? ' · different kit' : ''}
                </p>
              </div>
            </m.button>
          ))}
        </m.div>
      )}

      <button
        type="button"
        onClick={onBrowseAll}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-medium"
        style={{ background: 'var(--color-chalk)', color: 'var(--color-text-secondary)' }}
      >
        <Search size={14} /> Browse all exercises
      </button>
    </Modal>
  );
}
