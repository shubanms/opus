import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Portal to body so ancestor transforms (page animations) never trap the
  // fixed overlay inside a non-viewport containing block.
  //
  // z-[62]: this is a bottom-sheet, so its action row sits low on screen — right
  // where the CoachMark tip (z-60) and other passive overlays float. It must
  // stack ABOVE those (CoachMark/LevelUp at 60) or they intercept taps on the
  // sheet's buttons, but BELOW toasts + confirm/prompt dialogs (UiHost, z-80),
  // which must still appear over an open modal.
  return createPortal(
    <div
      className="fixed inset-0 z-[62] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(17,16,16,0.7)' }} />
      <div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl"
        style={{ background: 'var(--color-chalk)', animation: 'fadeSlideUp 300ms var(--ease-out)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed header */}
        <div className="flex flex-shrink-0 items-center justify-between px-5 pb-4 pt-5">
          <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
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
      </div>
    </div>,
    document.body
  );
}
