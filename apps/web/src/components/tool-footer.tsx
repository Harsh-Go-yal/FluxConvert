"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolFooterStep {
  title: string;
  description: string;
}

export interface ToolFooterFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface ToolFooterProps {
  /** Heading shown above the numbered steps, e.g. "How to Merge PDF". */
  heading: string;
  steps: ToolFooterStep[];
  /** Optional feature highlights rendered below the steps. */
  features?: ToolFooterFeature[];
  className?: string;
}

/**
 * Shared "How to" + feature section for tool pages. Renders numbered steps
 * with staggered entrance animations and an optional feature grid.
 */
export function ToolFooter({ heading, steps, features, className }: ToolFooterProps) {
  return (
    <div className={cn('mx-auto max-w-5xl', className)}>
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mb-12 text-center text-3xl font-bold"
      >
        {heading}
      </motion.h2>

      <div className="grid gap-8 md:grid-cols-3">
        {steps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
            className="flex flex-col items-center rounded-2xl border border-border/50 bg-card/50 p-6 text-center transition-colors hover:border-primary/30"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {index + 1}
            </div>
            <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
            <p className="text-muted-foreground">{step.description}</p>
          </motion.div>
        ))}
      </div>

      {features && features.length > 0 ? (
        <div className="mt-20 grid gap-10 text-left md:grid-cols-2">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
              className="flex gap-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-1 text-base font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default ToolFooter;
