import { create } from 'zustand';

interface Toast {
  type: 'success' | 'error' | 'info';
  title: string;
  subtitle?: string;
}

interface ToastState {
  toast: Toast | null;
  showToast: (toast: Toast) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (toast) => set({ toast }),
  hideToast: () => set({ toast: null }),
}));
