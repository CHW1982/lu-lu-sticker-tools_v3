import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ToastContext, ToastItem, ToastType } from '../hooks/useToast';

const TOAST_STYLES: Record<ToastType, string> = {
  info: 'bg-slate-800 text-white border-slate-700',
  success: 'bg-emerald-600 text-white border-emerald-500',
  warning: 'bg-amber-500 text-white border-amber-400',
  error: 'bg-red-600 text-white border-red-500',
};

const TOAST_ICONS: Record<ToastType, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', durationMs = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      if (durationMs > 0) {
        const timer = window.setTimeout(() => {
          timersRef.current.delete(id);
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, durationMs);
        timersRef.current.set(id, timer);
      }
    },
    []
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto rounded-2xl border-2 px-4 py-3 shadow-xl flex items-start gap-2.5 text-sm font-bold animate-fade-in ${TOAST_STYLES[toast.type]}`}
          >
            <span className="shrink-0">{TOAST_ICONS[toast.type]}</span>
            <span className="flex-1 break-words">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 opacity-80 hover:opacity-100 text-xs font-black px-1"
              aria-label="關閉通知"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = '確定',
  cancelLabel = '取消',
  danger = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border-4 border-lulu-100 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="text-lg font-black text-slate-800">
          {title}
        </h3>
        <p className="text-sm text-slate-600 font-medium leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-white text-sm font-bold shadow-sm transition-colors ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-lulu-500 hover:bg-lulu-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
