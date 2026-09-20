"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolHeaderProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  /** Tailwind text color class for the icon, e.g. "text-red-500". */
  accent?: string;
  /** Optional small badge rendered next to the title. */
  badge?: string;
  /** Optional content rendered below the description (e.g. breadcrumbs). */
  children?: React.ReactNode;
  className?: string;
}

export function ToolHeader({
  title,
  description,
  icon: Icon,
  accent = 'text-indigo-400',
  badge,
  children,
  className,
}: ToolHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className={cn('mx-auto max-w-3xl text-center', className)}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.05 }}
        className={cn(
          'relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-lg shadow-black/20',
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br opacity-40 blur-md',
            'from-indigo-500/40 to-fuchsia-500/30',
          )}
        />
        <Icon className={cn('relative h-7 w-7', accent)} />
      </motion.div>

      <div className="flex items-center justify-center gap-2">
        <h1 className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
          {title}
        </h1>
        {badge ? (
          <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
            {badge}
          </span>
        ) : null}
      </div>

      {description ? (
        <p className="mx-auto mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
          {description}
        </p>
      ) : null}

      {children ? <div className="mt-6">{children}</div> : null}
    </motion.header>
  );
}

export default ToolHeader;
