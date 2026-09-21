"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import { File as FileIcon, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@flux/utils';

export type FileCardStatus = 'idle' | 'processing' | 'done' | 'error';

export interface FileCardProps {
  name: string;
  size?: number;
  status?: FileCardStatus;
  /** Progress value between 0 and 100. Rendered when status is 'processing'. */
  progress?: number;
  /** Optional error message shown when status is 'error'. */
  error?: string;
  /** Optional secondary line (e.g. page count, dimensions). */
  meta?: string;
  onRemove?: () => void;
  className?: string;
}

const statusIcon: Record<FileCardStatus, React.ReactNode> = {
  idle: null,
  processing: <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />,
  done: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  error: <AlertTriangle className="h-4 w-4 text-red-400" />,
};

/**
 * Animated file card used across tool pages to display a single file with
 * status, progress, and optional remove action.
 */
export function FileCard({
  name,
  size,
  status = 'idle',
  progress,
  error,
  meta,
  onRemove,
  className,
}: FileCardProps) {
  const clamped =
    typeof progress === 'number'
      ? Math.max(0, Math.min(100, progress))
      : undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      whileHover={{ y: -2 }}
      className={cn(
        'group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 backdrop-blur-sm transition-colors hover:border-white/20',
        status === 'error' && 'border-red-500/30 bg-red-500/[0.04]',
        className,
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
        <FileIcon className="h-4 w-4 text-white/70" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {size !== undefined ? formatBytes(size) : null}
          {size !== undefined && meta ? ' • ' : null}
          {meta}
          {error ? (
            <span className="text-red-400">
              {size !== undefined || meta ? ' • ' : ''}
              {error}
            </span>
          ) : null}
        </p>

        {status === 'processing' && clamped !== undefined ? (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
              initial={{ width: 0 }}
              animate={{ width: `${clamped}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        {statusIcon[status]}
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label={`Remove ${name}`}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

export default FileCard;
