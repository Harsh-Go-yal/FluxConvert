"use client";

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertTriangle, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProgressStatus = 'idle' | 'running' | 'success' | 'error';

export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
}

export interface ProgressPanelProps {
  status: ProgressStatus;
  /** Overall progress between 0 and 1. */
  progress?: number;
  title?: string;
  description?: string;
  /** Optional list of sub-steps to render as a checklist. */
  steps?: ProgressStep[];
  /** Estimated remaining time in milliseconds. */
  etaMs?: number;
  onCancel?: () => void;
  className?: string;
}

function formatEta(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const s = Math.round(ms / 1000);
  if (s < 60) return `~${s}s remaining`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `~${m}m ${rem}s remaining`;
}

const statusAccent: Record<ProgressStatus, string> = {
  idle: 'from-slate-500/20 to-slate-500/10',
  running: 'from-indigo-500/30 to-fuchsia-500/20',
  success: 'from-emerald-500/30 to-teal-500/20',
  error: 'from-red-500/30 to-orange-500/20',
};

export function ProgressPanel({
  status,
  progress = 0,
  title,
  description,
  steps,
  etaMs,
  onCancel,
  className,
}: ProgressPanelProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const percent = Math.round(clamped * 100);

  const heading =
    title ??
    (status === 'running'
      ? 'Processing…'
      : status === 'success'
        ? 'Done'
        : status === 'error'
          ? 'Something went wrong'
          : 'Ready');

  return (
    <AnimatePresence>
      {status !== 'idle' ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className={cn(
            'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm',
            className,
          )}
        >
          <div
            className={cn(
              'pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-60',
              statusAccent[status],
            )}
          />

          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              {status === 'running' ? (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
              ) : status === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : status === 'error' ? (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              ) : (
                <Clock className="h-4 w-4 text-white/60" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-white">{heading}</p>
                {status === 'running' ? (
                  <span className="shrink-0 text-xs font-medium tabular-nums text-white/60">
                    {percent}%
                  </span>
                ) : null}
              </div>
              {description ? (
                <p className="mt-0.5 text-xs text-white/60">{description}</p>
              ) : null}

              {status === 'running' ? (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                  />
                </div>
              ) : null}

              {status === 'running' && etaMs && etaMs > 0 ? (
                <p className="mt-2 text-[11px] text-white/50">{formatEta(etaMs)}</p>
              ) : null}

              {steps && steps.length > 0 ? (
                <ul className="mt-4 space-y-1.5">
                  {steps.map((step) => (
                    <li
                      key={step.id}
                      className="flex items-center gap-2 text-xs text-white/70"
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded-full border text-[9px]',
                          step.status === 'done' &&
                            'border-emerald-400/40 bg-emerald-400/20 text-emerald-200',
                          step.status === 'active' &&
                            'border-indigo-400/40 bg-indigo-400/20 text-indigo-200',
                          step.status === 'error' &&
                            'border-red-400/40 bg-red-400/20 text-red-200',
                          step.status === 'pending' &&
                            'border-white/15 bg-white/5 text-white/40',
                        )}
                      >
                        {step.status === 'done' ? '✓' : step.status === 'error' ? '!' : ''}
                      </span>
                      <span
                        className={cn(
                          step.status === 'active' && 'font-medium text-white',
                          step.status === 'done' && 'text-white/60 line-through',
                        )}
                      >
                        {step.label}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {onCancel && status === 'running' ? (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label="Cancel operation"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default ProgressPanel;
