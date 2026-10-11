import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Modal from './Modal.jsx';
import InkButton from '../ink/InkButton.jsx';
import '../../styles/ink-sheets.css';
import useUIStore from '../../store/uiStore.js';

function Toasts() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);
  if (!toasts.length) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 z-[80] flex flex-col items-center gap-2 px-5"
      style={{ top: 'calc(12px + env(safe-area-inset-top))' }}
    >
      {toasts.map((t) => (
        // A toast with an action is a div with two controls inside it, not one
        // big button — nesting the Undo inside the dismiss button would make
        // every undo tap a coin flip between the two.
        <div
          key={t.id}
          className="ink-toast pointer-events-auto flex w-full max-w-md items-center gap-3 px-3 py-3 font-sans text-sm"
        >
          {/* Small seal: vermilion normally, dark ink for success, so the type still reads. */}
          <span
            aria-hidden="true"
            className="ink-toast-seal shrink-0"
            style={t.type === 'success' ? { background: 'var(--paper-ink-1, #1a1714)' } : undefined}
          />
          {/* The whole toast height dismisses it, not just the line of text. */}
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="-my-3 flex-1 py-3 text-left font-sans text-sm"
            style={{ color: 'inherit' }}
          >
            {t.message}
          </button>
          {t.action && (
            <button
              type="button"
              onClick={() => { dismiss(t.id); t.action.onAction(); }}
              className="-my-1 shrink-0 px-3 py-2 font-sans text-sm font-semibold uppercase"
              style={{ background: 'var(--ver, var(--color-gold))', color: 'var(--washi-3, var(--color-on-accent))', borderRadius: 4, letterSpacing: '0.1em' }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>,
    document.body
  );
}

function ConfirmDialog() {
  const state = useUIStore((s) => s.confirmState);
  const resolve = useUIStore((s) => s.resolveConfirm);
  if (!state) return null;
  const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger } = state;

  return (
    <Modal isOpen onClose={() => resolve(false)} title={title || 'Are you sure?'}>
      {message && (
        <p className="mb-5 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
      )}
      <div className="flex gap-3">
        <InkButton variant="secondary" block onClick={() => resolve(false)}>{cancelLabel}</InkButton>
        <InkButton
          variant="primary"
          block
          className={danger ? 'ink-btn--danger' : ''}
          onClick={() => resolve(true)}
        >
          {confirmLabel}
        </InkButton>
      </div>
    </Modal>
  );
}

function PromptDialog() {
  const state = useUIStore((s) => s.promptState);
  const resolve = useUIStore((s) => s.resolvePrompt);
  const [value, setValue] = useState('');

  useEffect(() => { setValue(state?.defaultValue ?? ''); }, [state]);

  if (!state) return null;
  const { title, message, placeholder } = state;

  return (
    <Modal isOpen onClose={() => resolve(null)} title={title || 'Add a note'}>
      {message && (
        <p className="mb-3 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
      )}
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="ink-field w-full resize-none px-3 py-2 font-sans text-sm outline-none"
      />
      <div className="mt-4 flex gap-3">
        <InkButton variant="secondary" block onClick={() => resolve(null)}>Cancel</InkButton>
        <InkButton variant="primary" block onClick={() => resolve(value.trim())}>Save</InkButton>
      </div>
    </Modal>
  );
}

export default function UiHost() {
  return (
    <>
      <Toasts />
      <ConfirmDialog />
      <PromptDialog />
    </>
  );
}
