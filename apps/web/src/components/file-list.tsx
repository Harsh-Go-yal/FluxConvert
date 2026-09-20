"use client";

import * as React from 'react';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import {
  File as FileIcon,
  GripVertical,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@flux/utils';

export type FileListStatus = 'idle' | 'processing' | 'done' | 'error';

export interface FileListItem {
  id: string;
  file: File;
  status?: FileListStatus;
  progress?: number;
  error?: string;
}

export interface FileListProps {
  items: FileListItem[];
  onRemove?: (id: string) => void;
  onReorder?: (items: FileListItem[]) => void;
  className?: string;
  emptyMessage?: string;
  reorderable?: boolean;
}

function StatusIcon({ status }: { status?: FileListStatus }) {
  if (status === 'processing') {
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

export function FileList({
  items,
  onRemove,
  onReorder,
  className,
  emptyMessage = 'No files added yet.',
  reorderable = false,
}: FileListProps) {
  const [order, setOrder] = React.useState<FileListItem[]>(items);

  React.useEffect(() => {
    setOrder(items);
  }, [items]);

  const handleReorder = React.useCallback(
    (next: FileListItem[]) => {
      setOrder(next);
      onReorder?.(next);
    },
    [onReorder],
  );

  if (!items.length) {
    return (
      <div
        className={cn(
          'flex min-h-[80px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-white/50',
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  const content = (
    <AnimatePresence initial={false}>
      {order.map((item) => (
        <motion.li
          key={item.id}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className={cn(
            'group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-white/20',
            item.status === 'error' && 'border-red-500/40 bg-red-500/5',
          )}
        >
          {reorderable ? (
            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-white/30 transition-colors group-hover:text-white/60 active:cursor-grabbing" />
          ) : null}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
            <FileIcon className="h-4 w-4 text-white/70" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white">{item.file.name}</p>
            <p className="text-xs text-white/50">
              {formatBytes(item.file.size)}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                className="rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label={`Remove ${item.file.name}`}
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
        values={order}
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
