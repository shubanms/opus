import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
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
    </div>
  );
}
