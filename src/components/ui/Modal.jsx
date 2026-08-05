import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  AnimatePresence,
  m,
  backdropVariants,
  sheetVariants,
  useMotionEnabled,
} from '../../motion/index.jsx';

export default function Modal({ isOpen, onClose, title, children }) {
  const motionOn = useMotionEnabled();

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Portal to body so ancestor transforms (page animations) never trap the
  // fixed overlay inside a non-viewport containing block.
  //
  // z-[62]: this is a bottom-sheet, so its action row sits low on screen — right
  // where the CoachMark tip (z-60) and other passive overlays float. It must
  // stack ABOVE those (CoachMark/LevelUp at 60) or they intercept taps on the
  // sheet's buttons, but BELOW toasts + confirm/prompt dialogs (UiHost, z-80),
  // which must still appear over an open modal.
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[62] flex items-end justify-center">
          <m.div
            className="absolute inset-0"
            style={{ background: 'rgba(6, 9, 20, 0.62)', backdropFilter: 'blur(3px)' }}
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
          />
          <m.div
            className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl"
            style={{
              background: 'var(--color-chalk)',
              boxShadow: 'var(--elev-3)',
              borderTop: '1px solid var(--glass-line)',
            }}
            variants={sheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            // Drag down to dismiss. Disabled when motion is off, so the sheet
            // can't be left in a position nothing will animate back from.
            drag={motionOn ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              // A decisive flick counts as much as distance on a phone.
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            {/* Grab handle — the affordance that says the sheet is draggable. */}
            <div className="flex shrink-0 justify-center pt-2.5">
              <span
                className="h-1 w-9 rounded-full"
                style={{ background: 'var(--color-ash)', opacity: 0.4 }}
              />
            </div>

            {/* Fixed header */}
            <div className="flex shrink-0 items-center justify-between px-5 pb-4 pt-3">
              <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: 'var(--color-ivory)' }}
              >
                <X size={16} style={{ color: 'var(--color-ash)' }} />
              </button>
            </div>

            {/* Scrollable body */}
            <div
              className="overflow-y-auto px-5"
              style={{ paddingBottom: 'calc(var(--space-8) + env(safe-area-inset-bottom))' }}
            >
              {children}
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
