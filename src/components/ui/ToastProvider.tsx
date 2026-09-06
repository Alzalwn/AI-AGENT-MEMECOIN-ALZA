'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 4000
}

interface ToastContextType {
  toasts: Toast[];
  toast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, title, message, duration }]);

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
    },
    [dismiss]
  );

  const success = useCallback((title: string, message?: string) => toast('success', title, message), [toast]);
  const error   = useCallback((title: string, message?: string) => toast('error', title, message, 6000), [toast]);
  const warning = useCallback((title: string, message?: string) => toast('warning', title, message, 5000), [toast]);
  const info    = useCallback((title: string, message?: string) => toast('info', title, message), [toast]);

  return (
    <ToastContext.Provider value={{ toasts, toast, success, error, warning, info, dismiss }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── Toast Icon & Color Mapping ───────────────────────────────────────────────

const TOAST_STYLES: Record<ToastType, { icon: React.ReactNode; border: string; bg: string; iconColor: string }> = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400'
  },
  error: {
    icon: <XCircle className="w-4 h-4" />,
    border: 'border-rose-500/50',
    bg: 'bg-rose-500/10',
    iconColor: 'text-rose-400'
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    border: 'border-amber-500/50',
    bg: 'bg-amber-500/10',
    iconColor: 'text-amber-400'
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    border: 'border-cyan-500/50',
    bg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400'
  }
};

// ─── Toaster Component ────────────────────────────────────────────────────────

interface ToasterProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function Toaster({ toasts, onDismiss }: ToasterProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="fixed bottom-16 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => {
        const style = TOAST_STYLES[t.type];
        return (
          <div
            key={t.id}
            role="alert"
            aria-atomic="true"
            className={`
              pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-[360px]
              rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-xl font-mono text-sm
              bg-zinc-900/95 ${style.border}
              animate-[slide-in-right_0.2s_ease-out]
            `}
          >
            {/* Icon */}
            <span className={`mt-0.5 shrink-0 ${style.iconColor}`}>
              {style.icon}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-zinc-100 text-[12px] leading-tight truncate">
                {t.title}
              </p>
              {t.message && (
                <p className="text-zinc-400 text-[11px] mt-0.5 leading-snug line-clamp-2">
                  {t.message}
                </p>
              )}
            </div>

            {/* Dismiss */}
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 mt-0.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
