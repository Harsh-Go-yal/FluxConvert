"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@flux/ui';

export interface ToolCardProps {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: string;
  badge?: string;
  className?: string;
}

export function ToolCard({
  href,
  title,
  description,
  icon: Icon,
  accent = 'from-indigo-500/20 to-fuchsia-500/20',
  badge,
  className,
}: ToolCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={cn('group relative', className)}
    >
      <Link
        href={href}
        className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition-colors hover:border-white/20"
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100',
            'bg-gradient-to-br',
            accent,
          )}
        />
        <div className="relative flex items-start justify-between">
          <motion.div
            whileHover={{ rotate: -6, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5"
          >
            <Icon className="h-5 w-5 text-white" />
          </motion.div>
          {badge ? (
            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/70">
              {badge}
            </span>
          ) : null}
        </div>
        <div className="relative mt-4 flex-1">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-white/60">{description}</p>
        </div>
        <div className="relative mt-4 flex items-center gap-1 text-xs font-medium text-white/70 transition-colors group-hover:text-white">
          Open tool
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.div>
  );
}
