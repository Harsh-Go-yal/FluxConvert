"use client";

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@flux/ui';

type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  error: 'border-red-500/30 bg-red-500/10 text-red-100',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
};

const variantIcon: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
  error: <AlertTriangle className="h-5 w-5 text-red-400" />,
  info: <Info className="h-5 w-5 text-sky-400" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback<ToastContextValue['toast']>((t) => {
    const id = Math.random().toString(36).slice(2);
    const item: ToastItem = { id, variant: 'info', duration: 4000, ...t };
    setItems((prev) => [...prev, item]);
    if (item.duration && item.duration > 0) {
      window.setTimeout(() => dismiss(id), item.duration);
    }
    return id;
  }, [dismiss]);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md',
                variantStyles[item.variant ?? 'info'],
              )}
            >
              <div className="mt-0.5">{variantIcon[item.variant ?? 'info']}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs opacity-80">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-md p-1 opacity-70 transition hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
