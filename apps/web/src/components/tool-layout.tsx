"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolLayoutProps {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind text color class for the icon accent, e.g. "text-red-500". */
  accent?: string;
  children: React.ReactNode;
  /** Optional content rendered below the main tool area (e.g. how-to steps). */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Shared shell for tool pages: animated gradient background, hero header
 * with icon, and a glassy content card. Keeps every tool visually consistent.
 */
export function ToolLayout({
  title,
  description,
  icon: Icon,
  accent = 'text-primary',
  children,
  footer,
  className,
}: ToolLayoutProps) {
  return (
    <main
      className={cn(
        'relative min-h-screen overflow-hidden bg-background text-foreground selection:bg-primary/20',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute -top-32 -left-32 h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.15, ease: 'easeOut' }}
          className="absolute -bottom-32 -right-32 h-[40%] w-[40%] rounded-full bg-purple-600/10 blur-[120px]"
        />
      </div>

      <div className="container mx-auto px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mx-auto mb-12 max-w-4xl text-center"
        >
          <div
            className={cn(
              'mb-8 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-current/10 shadow-2xl shadow-current/20 ring-1 ring-current/20',
              accent,
            )}
          >
            <Icon className="h-10 w-10" />
          </div>
          <h1 className="mb-6 bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-6xl">
            {title}
          </h1>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-muted-foreground md:text-2xl">
            {description}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="relative z-10 mx-auto mb-24 max-w-4xl"
        >
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-primary/20 to-purple-600/20 opacity-50 blur-3xl" />
          <div className="glass rounded-3xl border border-white/10 bg-card/50 p-2 shadow-2xl shadow-black/5 backdrop-blur-xl md:p-6 dark:border-white/5">
            {children}
          </div>
        </motion.div>

        {footer ? <div className="mx-auto max-w-5xl">{footer}</div> : null}
      </div>
    </main>
  );
}

export default ToolLayout;
