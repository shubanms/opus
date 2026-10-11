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
import '../../styles/ink-sheets.css';
import { useBackToClose } from '../../hooks/useBackToClose.js';

export default function Modal({ isOpen, onClose, title, children }) {
  const motionOn = useMotionEnabled();
  // Android's Back closes the sheet rather than the page under it — which used
  // to unmount, taking anything unsaved in the sheet with it.
  useBackToClose(isOpen, onClose);

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
            className="modal-scrim absolute inset-0"
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
          />
          <m.div
            className="ink-sheet relative flex max-h-[90vh] w-full max-w-md flex-col"
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
              <span className="ink-sheet__grabber" />
            </div>

            {/* Fixed header */}
            <div className="flex shrink-0 items-center justify-between px-5 pb-4 pt-3">
              <h2 className="ink-sheet__title">{title}</h2>
              {/* A 44 px target around the 32 px disc; the negative margin keeps
                  the header the height it was. */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-my-1.5 -mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              >
                <span className="ink-sheet__close">
                  <X size={16} />
                </span>
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
