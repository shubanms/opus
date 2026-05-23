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
        className="relative w-full max-w-md rounded-t-3xl px-5 pb-10 pt-5"
        style={{ background: 'var(--color-chalk)', animation: 'fadeSlideUp 300ms var(--ease-out)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
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
        {children}
      </div>
    </div>
  );
}
