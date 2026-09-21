"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional icon rendered before the label. */
  icon?: React.ReactNode;
  /** Optional disabled state. */
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Unique id used to scope the animated highlight layout. */
  id?: string;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Animated segmented control with a sliding highlight. Used across tool pages
 * to switch between modes (e.g. Extract vs. Remove, PNG vs. JPG).
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  id = 'segmented',
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  const layoutId = React.useMemo(
    () => `segmented-highlight-${id}`,
    [id],
  );

  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-sm',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={option.disabled}
            onClick={() => !option.disabled && onChange(option.value)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-full font-medium transition-colors',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
              active
                ? 'text-white'
                : 'text-white/60 hover:text-white/90',
              option.disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-indigo-500/80 to-fuchsia-500/80 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.6)]"
              />
            ) : null}
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
