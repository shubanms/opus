import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Modal from './Modal.jsx';
import useUIStore from '../../store/uiStore.js';

function Toasts() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);
  if (!toasts.length) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[80] flex flex-col items-center gap-2 px-5">
      {toasts.map((t) => (
        // A toast with an action is a div with two controls inside it, not one
        // big button — nesting the Undo inside the dismiss button would make
        // every undo tap a coin flip between the two.
        <div
          key={t.id}
          className="anim-fade-slide-up pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl px-4 py-3 font-sans text-sm"
          style={{
            background: 'var(--color-obsidian)',
            color: 'var(--color-text-inverse)',
            borderLeft: `3px solid ${t.type === 'error' ? 'var(--color-ember)' : t.type === 'success' ? 'var(--color-sage)' : 'var(--color-gold)'}`,
            boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
          }}
        >
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="flex-1 text-left font-sans text-sm"
            style={{ color: 'inherit' }}
          >
            {t.message}
          </button>
          {t.action && (
            <button
              type="button"
              onClick={() => { dismiss(t.id); t.action.onAction(); }}
              className="-my-1 shrink-0 rounded-lg px-3 py-2 font-sans text-sm font-semibold"
              style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
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
        <button
          onClick={() => resolve(false)}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => resolve(true)}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-semibold"
          style={{ background: danger ? 'var(--color-ember)' : 'var(--color-gold)', color: danger ? 'var(--color-text-inverse)' : 'var(--color-obsidian)' }}
        >
          {confirmLabel}
        </button>
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
        className="w-full resize-none rounded-xl px-3 py-2 font-sans text-sm outline-none"
        style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
      />
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => resolve(null)}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          Cancel
        </button>
        <button
          onClick={() => resolve(value.trim())}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          Save
        </button>
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
