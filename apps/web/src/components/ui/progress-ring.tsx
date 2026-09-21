"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ProgressRingProps {
  /** Progress value between 0 and 100. */
  value: number;
  /** Diameter of the ring in pixels. Defaults to 96. */
  size?: number;
  /** Stroke width in pixels. Defaults to 8. */
  strokeWidth?: number;
  /** Optional label rendered inside the ring. Defaults to the percentage. */
  label?: React.ReactNode;
  /** Optional caption rendered below the label. */
  caption?: string;
  /** Optional className applied to the wrapper. */
  className?: string;
  /** Optional gradient id suffix to avoid collisions. */
  id?: string;
}

/**
 * Animated circular progress indicator with a gradient stroke. Used to show
 * long-running client-side operations (merge, compress, OCR, etc.).
 */
export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 8,
  label,
  caption,
  className,
  id = 'ring',
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);
  const gradientId = React.useMemo(() => `progress-ring-gradient-${id}`, [id]);

  return (
    <div
      className={cn('inline-flex flex-col items-center gap-2', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#e879f9" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/10"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ type: 'spring', stiffness: 120, damping: 24 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-foreground">
            {label ?? `${Math.round(clamped)}%`}
          </span>
          {caption ? (
            <span className="mt-0.5 text-[10px] uppercase tracking-wider text-white/50">
              {caption}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ProgressRing;
