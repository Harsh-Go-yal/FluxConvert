"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatBadgeProps {
  /** Optional leading icon. */
  icon?: LucideIcon;
  /** Primary label (e.g. "Pages"). */
  label: string;
  /** Value to display (e.g. "12"). */
  value: React.ReactNode;
  /** Optional accent color class (e.g. "text-indigo-300"). */
  accent?: string;
  className?: string;
}

/**
 * Compact animated stat badge used to surface file metrics (page count,
 * dimensions, size) across tool pages.
 */
export function StatBadge({
  icon: Icon,
  label,
  value,
  accent = 'text-indigo-300',
  className,
}: StatBadgeProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs backdrop-blur-sm',
        className,
      )}
    >
      {Icon ? <Icon className={cn('h-3.5 w-3.5', accent)} /> : null}
      <span className="text-white/50">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </motion.div>
  );
}

export default StatBadge;
