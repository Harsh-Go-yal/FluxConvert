"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatPageRanges,
  parsePageRanges,
  presetToIndices,
  type RangePreset,
} from '@/lib/pdf/ranges';

export interface PageRangeSelectorProps {
  totalPages: number;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  label?: string;
  hint?: string;
}

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'odd', label: 'Odd' },
  { id: 'even', label: 'Even' },
  { id: 'first', label: 'First' },
  { id: 'last', label: 'Last' },
];

export function PageRangeSelector({
  totalPages,
  value,
  onChange,
  className,
  disabled,
  label = 'Pages to include',
  hint,
}: PageRangeSelectorProps) {
  const parsed = React.useMemo(
    () => parsePageRanges(value, totalPages),
    [value, totalPages],
  );

  const selectedCount = parsed.indices.length;
  const hasError = Boolean(parsed.error);

  const applyPreset = (preset: RangePreset) => {
    const indices = presetToIndices(preset, totalPages);
    onChange(formatPageRanges(indices));
  };

  return (
    <div className={cn('w-full space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-white/80">{label}</label>
        <span className="text-xs text-white/50">
          {totalPages > 0 ? `${totalPages} page${totalPages === 1 ? '' : 's'}` : 'No pages'}
        </span>
      </div>

      <div
        className={cn(
          'relative flex items-center gap-2 rounded-xl border bg-white/[0.03] px-3 py-2 transition-colors',
          hasError
            ? 'border-red-500/50 focus-within:border-red-400'
            : 'border-white/10 focus-within:border-indigo-400/60',
          disabled && 'opacity-60',
        )}
      >
        <Hash className="h-4 w-4 shrink-0 text-white/40" />
        <input
          type="text"
          inputMode="text"
          spellCheck={false}
          autoComplete="off"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 1-3, 5, 8-"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
        />
        {!hasError && selectedCount > 0 ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
        ) : null}
        {hasError ? (
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <motion.button
            key={preset.id}
            type="button"
            whileTap={{ scale: 0.94 }}
            whileHover={{ y: -1 }}
            disabled={disabled || totalPages === 0}
            onClick={() => applyPreset(preset.id)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {preset.label}
          </motion.button>
        ))}
      </div>

      <div className="min-h-[1.25rem] text-xs">
        {hasError ? (
          <motion.p
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400"
          >
            {parsed.error}
          </motion.p>
        ) : (
          <motion.p
            key={selectedCount}
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white/50"
          >
            {selectedCount} of {totalPages} page{totalPages === 1 ? '' : 's'} selected
            {hint ? ` • ${hint}` : ''}
          </motion.p>
        )}
      </div>
    </div>
  );
}

export default PageRangeSelector;
