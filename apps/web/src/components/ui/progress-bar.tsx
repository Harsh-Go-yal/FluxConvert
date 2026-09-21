"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value?: number;
  indeterminate?: boolean;
  label?: string;
  hint?: string;
  className?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
}

const toneGradient: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  primary: 'from-indigo-400 via-violet-400 to-fuchsia-400',
  success: 'from-emerald-400 via-teal-400 to-cyan-400',
  warning: 'from-amber-400 via-orange-400 to-rose-400',
  danger: 'from-rose-500 via-red-500 to-orange-500',
};

export function ProgressBar({
  value = 0,
  indeterminate = false,
  label,
  hint,
  className,
  tone = 'primary',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('w-full', className)}>
      {(label || hint) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label ? <span className="font-medium text-white/80">{label}</span> : <span />}
          {hint ? (
            <span className="tabular-nums text-white/50">
              {indeterminate ? 'Working…' : `${Math.round(clamped)}%`}
            </span>
          ) : null}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
        className="relative h-2 w-full overflow-hidden rounded-full bg-white/10"
      >
        {indeterminate ? (
          <motion.div
            className={cn(
              'absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r',
              toneGradient[tone],
            )}
            initial={{ x: '-120%' }}
            animate={{ x: '320%' }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          />
        ) : (
          <motion.div
            className={cn('h-full rounded-full bg-gradient-to-r', toneGradient[tone])}
            initial={{ width: 0 }}
            animate={{ width: `${clamped}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          />
        )}
      </div>
    </div>
  );
}

export default ProgressBar;
