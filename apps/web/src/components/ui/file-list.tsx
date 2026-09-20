"use client";

import * as React from 'react';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import { File as FileIcon, GripVertical, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@flux/utils';

export type FileListStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export interface FileListItem {
  id: string;
  name: string;
  size: number;
  status?: FileListStatus;
  progress?: number;
  error?: string;
}

export interface FileListProps {
  items: FileListItem[];
  onRemove?: (id: string) => void;
  onReorder?: (items: FileListItem[]) => void;
  /** When true, items can be dragged to reorder. */
  reorderable?: boolean;
  className?: string;
  emptyLabel?: string;
}

function StatusIcon({ status }: { status?: FileListStatus }) {
  if (status === 'uploading' || status === 'processing') {
    return <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />;
  }
  if (status === 'done') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  }
  if (status === 'error') {
    return <AlertTriangle className="h-4 w-4 text-red-400" />;
  }
  return null;
}

/**
 * Animated list of files with optional drag-to-reorder, per-item progress,
 * status indicators, and remove actions. Fully keyboard accessible.
 */
export function FileList({
  items,
  onRemove,
  onReorder,
  reorderable = false,
  className,
  emptyLabel = 'No files yet',
}: FileListProps) {
  const handleReorder = React.useCallback(
    (next: FileListItem[]) => {
      onReorder?.(next);
    },
    [onReorder],
  );

  if (!items.length) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-white/40',
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  const content = (
    <AnimatePresence initial={false}>
      {items.map((item) => (
        <motion.li
          key={item.id}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
        >
          {reorderable ? (
            <span className="cursor-grab text-white/30 transition-colors hover:text-white/60 active:cursor-grabbing">
              <GripVertical className="h-4 w-4" />
            </span>
          ) : null}
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
            <FileIcon className="h-4 w-4 text-white/70" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white">{item.name}</p>
            <p className="text-xs text-white/50">
              {formatBytes(item.size)}
              {item.error ? ` • ${item.error}` : ''}
            </p>
            {typeof item.progress === 'number' && item.status !== 'done' ? (
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <StatusIcon status={item.status} />
            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label={`Remove ${item.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </motion.li>
      ))}
    </AnimatePresence>
  );

  if (reorderable && onReorder) {
    return (
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={handleReorder}
        className={cn('space-y-2', className)}
      >
        {content}
      </Reorder.Group>
    );
  }

  return <ul className={cn('space-y-2', className)}>{content}</ul>;
}

export default FileList;
