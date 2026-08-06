import { create } from 'zustand';

let idSeq = 0;

const useUIStore = create((set, get) => ({
  toasts: [],
  confirmState: null, // { title, message, confirmLabel, cancelLabel, danger, resolve }
  promptState: null,  // { title, message, placeholder, defaultValue, resolve }

  // `opts.action` is `{ label, onAction }` — the undo affordance. A toast that
  // carries one gets longer on screen by default, because the whole point is
  // that it has to outlast the moment you realise you tapped the wrong row.
  showToast(message, opts = {}) {
    const id = ++idSeq;
    const action = opts.action ?? null;
    set((s) => ({ toasts: [...s.toasts, { id, message, type: opts.type ?? 'info', action }] }));
    setTimeout(() => get().dismissToast(id), opts.duration ?? (action ? 7000 : 3000));
    return id;
  },
  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  // Returns a Promise<boolean>.
  confirm(options) {
    return new Promise((resolve) => set({ confirmState: { ...options, resolve } }));
  },
  resolveConfirm(result) {
    const st = get().confirmState;
    set({ confirmState: null });
    st?.resolve(result);
  },

  // Returns a Promise<string|null> (null = cancelled).
  prompt(options) {
    return new Promise((resolve) => set({ promptState: { ...options, resolve } }));
  },
  resolvePrompt(value) {
    const st = get().promptState;
    set({ promptState: null });
    st?.resolve(value);
  },
}));

export default useUIStore;
