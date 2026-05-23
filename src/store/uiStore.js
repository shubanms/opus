import { create } from 'zustand';

const useUIStore = create((set) => ({
  toast: null,
  activeModal: null,

  showToast(message, type = 'info') {
    set({ toast: { message, type, id: Date.now() } });
    setTimeout(() => set(s => s.toast?.message === message ? { toast: null } : s), 3000);
  },
  hideToast() {
    set({ toast: null });
  },

  openModal(id) {
    set({ activeModal: id });
  },
  closeModal() {
    set({ activeModal: null });
  },
}));

export default useUIStore;
