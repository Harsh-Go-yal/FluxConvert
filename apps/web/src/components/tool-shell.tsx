"use client";

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolShellProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  /** Tailwind text color class used for the icon accent, e.g. "text-red-500". */
  accent?: string;
  /** Optional badge rendered next to the title (e.g. "Beta"). */
  badge?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared page shell for every in-browser tool. Provides a consistent animated
 * hero header, gradient backdrop, and centered content column so individual
 * tool pages only need to render their own interactive body.
 */
export function ToolShell({
  title,
  description,
  icon: Icon,
  accent = 'text-primary',
  badge,
  children,
  className,
}: ToolShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground selection:bg-primary/20">
      {/* Ambient gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 h-[40%] w-[40%] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mx-auto mb-10 max-w-3xl text-center"
        >
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All tools
          </Link>

          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0.9, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-2xl bg-current/10 ring-1 ring-current/20',
                accent,
              )}
            >
              <Icon className="h-8 w-8" />
            </motion.div>

            <div className="flex items-center gap-2">
              <h1 className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl">
                {title}
              </h1>
              {badge ? (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {badge}
                </span>
              ) : null}
            </div>

            {description ? (
              <p className="max-w-xl text-base text-muted-foreground md:text-lg">
                {description}
              </p>
            ) : null}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05, ease: 'easeOut' }}
          className={cn('mx-auto max-w-3xl', className)}
        >
          {children}
        </motion.div>
      </div>
    </main>
  );
}

export default ToolShell;
