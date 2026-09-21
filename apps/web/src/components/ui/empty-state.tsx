"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** Optional leading icon. */
  icon?: LucideIcon;
  /** Primary heading text. */
  title: string;
  /** Optional supporting description. */
  description?: string;
  /** Optional action node (e.g. a button). */
  action?: React.ReactNode;
  /** Optional className applied to the wrapper. */
  className?: string;
}

/**
 * Animated empty-state placeholder used across tool pages when no files have
 * been added yet or a result set is empty.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center',
        className,
      )}
    >
      {Icon ? (
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5"
        >
          <Icon className="h-6 w-6 text-white/70" />
        </motion.div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-xs text-white/50">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </motion.div>
  );
}

export default EmptyState;
