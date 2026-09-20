"use client";

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, RotateCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PageThumbnail } from '@/lib/pdf/thumbnails';

export interface PdfPageGridProps {
  thumbnails: PageThumbnail[];
  selected?: number[];
  onToggle?: (index: number) => void;
  onRotate?: (index: number) => void;
  onRemove?: (index: number) => void;
  rotations?: Record<number, number>;
  loading?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function PdfPageGrid({
  thumbnails,
  selected = [],
  onToggle,
  onRotate,
  onRemove,
  rotations = {},
  loading = false,
  className,
  emptyMessage = 'No pages to display.',
}: PdfPageGridProps) {
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  if (loading) {
    return (
      <div className={cn('flex min-h-[200px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02]', className)}>
        <div className="flex flex-col items-center gap-3 text-white/60">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-300" />
          <p className="text-sm">Rendering page previews…</p>
        </div>
      </div>
    );
  }

  if (!thumbnails.length) {
    return (
      <div className={cn('flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-white/50', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
        className,
      )}
    >
      <AnimatePresence initial={false}>
        {thumbnails.map((thumb) => {
          const isSelected = selectedSet.has(thumb.index);
          const rotation = rotations[thumb.index] ?? 0;
          return (
            <motion.div
              key={thumb.index}
              layout
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -3 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className={cn(
                'group relative overflow-hidden rounded-xl border bg-white/[0.03] p-2 transition-colors',
                isSelected
                  ? 'border-indigo-400/70 shadow-[0_0_0_1px_rgba(129,140,248,0.6),0_12px_40px_-16px_rgba(129,140,248,0.6)]'
                  : 'border-white/10 hover:border-white/25',
              )}
            >
              <button
                type="button"
                onClick={() => onToggle?.(thumb.index)}
                className="block w-full"
                aria-pressed={isSelected}
                aria-label={`Page ${thumb.pageNumber}`}
              >
                <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb.dataUrl}
                    alt={`Page ${thumb.pageNumber}`}
                    className="h-full w-full object-contain transition-transform duration-300"
                    style={{ transform: `rotate(${rotation}deg)` }}
                    draggable={false}
                  />
                  <AnimatePresence>
                    {isSelected ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg"
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </button>

              <div className="mt-2 flex items-center justify-between px-0.5">
                <span className="text-[11px] font-medium tabular-nums text-white/60">
                  {thumb.pageNumber}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {onRotate ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRotate(thumb.index);
                      }}
                      className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                      aria-label={`Rotate page ${thumb.pageNumber}`}
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  {onRemove ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(thumb.index);
                      }}
                      className="rounded-md p-1 text-white/60 transition hover:bg-red-500/20 hover:text-red-300"
                      aria-label={`Remove page ${thumb.pageNumber}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default PdfPageGrid;
