"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepIndicatorStep {
  id: string;
  label: string;
  description?: string;
}

export interface StepIndicatorProps {
  steps: StepIndicatorStep[];
  /** Zero-based index of the currently active step. */
  current: number;
  /** Optional click handler to allow navigating back to a completed step. */
  onStepClick?: (index: number) => void;
  className?: string;
}

/**
 * Animated horizontal step indicator for multi-step tool flows.
 * Completed steps show a check, the active step is highlighted, and
 * future steps remain muted. Fully responsive and keyboard accessible.
 */
export function StepIndicator({
  steps,
  current,
  onStepClick,
  className,
}: StepIndicatorProps) {
  return (
    <ol
      className={cn(
        'flex w-full items-center gap-2 overflow-x-auto pb-1 sm:gap-4',
        className,
      )}
      aria-label="Progress"
    >
      {steps.map((step, index) => {
        const isComplete = index < current;
        const isActive = index === current;
        const isClickable = Boolean(onStepClick) && index < current;

        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick?.(index)}
              className={cn(
                'group flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors sm:gap-3 sm:px-3',
                isClickable && 'cursor-pointer hover:bg-white/5',
                !isClickable && 'cursor-default',
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              <motion.span
                initial={false}
                animate={{
                  scale: isActive ? 1.05 : 1,
                  backgroundColor: isComplete
                    ? 'rgba(16,185,129,0.15)'
                    : isActive
                      ? 'rgba(99,102,241,0.18)'
                      : 'rgba(255,255,255,0.04)',
                  borderColor: isComplete
                    ? 'rgba(16,185,129,0.5)'
                    : isActive
                      ? 'rgba(99,102,241,0.6)'
                      : 'rgba(255,255,255,0.12)',
                }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold text-white"
              >
                {isComplete ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <span className={cn(isActive ? 'text-indigo-200' : 'text-white/60')}>
                    {index + 1}
                  </span>
                )}
              </motion.span>
              <span className="hidden min-w-0 flex-col sm:flex">
                <span
                  className={cn(
                    'truncate text-sm font-medium transition-colors',
                    isActive ? 'text-white' : 'text-white/60',
                  )}
                >
                  {step.label}
                </span>
                {step.description ? (
                  <span className="truncate text-xs text-white/40">
                    {step.description}
                  </span>
                ) : null}
              </span>
            </button>
            {index < steps.length - 1 ? (
              <div className="relative h-px flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={false}
                  animate={{ width: isComplete ? '100%' : '0%' }}
                  transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400/70 to-indigo-400/70"
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export default StepIndicator;
