"use client";

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Zap, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface ToolShellProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: string;
  children: React.ReactNode;
  steps?: { title: string; description: string }[];
  className?: string;
}

const DEFAULT_STEPS = [
  { title: 'Upload your files', description: 'Drag and drop files into the box above or click to select them.' },
  { title: 'Process', description: 'Your files are processed instantly in your browser — nothing is uploaded.' },
  { title: 'Download', description: 'Grab your result. Secure, fast, and high quality.' },
];

export function ToolShell({
  title,
  description,
  icon: Icon,
  accent = 'from-indigo-500/20 to-fuchsia-500/20',
  children,
  steps = DEFAULT_STEPS,
  className,
}: ToolShellProps) {
  return (
    <main className={cn('relative min-h-screen overflow-hidden bg-background text-foreground selection:bg-primary/20', className)}>
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 h-[40%] w-[40%] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-10 md:py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all tools
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-10 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 20 }}
            className={cn(
              'mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br shadow-lg',
              accent,
            )}
          >
            <Icon className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              Private by default
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Instant processing
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
              No signup required
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="relative mb-16"
        >
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-primary/20 to-fuchsia-500/20 opacity-50 blur-3xl" />
          <div className="rounded-3xl border border-white/10 bg-card/50 p-4 shadow-2xl shadow-black/5 backdrop-blur-xl md:p-6">
            {children}
          </div>
        </motion.div>

        {steps.length > 0 ? (
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center text-2xl font-bold">How it works</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex flex-col items-center rounded-2xl border border-border/50 bg-card/50 p-6 text-center transition-colors hover:border-primary/30"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {i + 1}
                  </div>
                  <h3 className="mb-2 text-base font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default ToolShell;
