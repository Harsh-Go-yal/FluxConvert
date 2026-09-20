"use client";

import * as React from 'react';
import { useDropzone, type Accept, type FileRejection } from 'react-dropzone';
import { AnimatePresence, motion } from 'framer-motion';
import { UploadCloud, File as FileIcon, X, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@flux/utils';

export type DropzoneFileStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export interface DropzoneFile {
  id: string;
  file: File;
  status: DropzoneFileStatus;
  progress?: number;
  error?: string;
}

export interface DropzoneProps {
  accept?: Accept;
  multiple?: boolean;
  maxSize?: number;
  files: DropzoneFile[];
  onFilesAdded: (files: File[]) => void;
  onRemove: (id: string) => void;
  onReject?: (rejections: FileRejection[]) => void;
  className?: string;
  hint?: string;
}

export function Dropzone({
  accept,
  multiple = true,
  maxSize = 100 * 1024 * 1024,
  files,
  onFilesAdded,
  onRemove,
  onReject,
  className,
  hint,
}: DropzoneProps) {
  const onDrop = React.useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (accepted.length) onFilesAdded(accepted);
      if (rejections.length && onReject) onReject(rejections);
    },
    [onFilesAdded, onReject],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxSize,
  });

  return (
    <div className={cn('w-full', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200',
          isDragActive
            ? 'border-indigo-400/70 bg-indigo-500/5 shadow-[0_0_0_2px_rgba(99,102,241,0.6),0_20px_60px_-20px_rgba(99,102,241,0.5)] scale-[1.01]'
            : 'border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]',
          isDragReject && 'border-red-500/60 bg-red-500/5',
        )}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={{ y: isDragActive ? -4 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5"
        >
          <UploadCloud className="h-6 w-6 text-white/80" />
        </motion.div>
        <div>
          <p className="text-sm font-medium text-white">
            {isDragActive ? 'Drop files here' : 'Drag & drop files, or click to browse'}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {hint ?? `Up to ${formatBytes(maxSize)} per file`}
          </p>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {files.length > 0 ? (
          <motion.ul
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-4 space-y-2"
          >
            {files.map((f) => (
              <motion.li
                key={f.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <FileIcon className="h-4 w-4 text-white/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{f.file.name}</p>
                  <p className="text-xs text-white/50">
                    {formatBytes(f.file.size)}
                    {f.error ? ` • ${f.error}` : ''}
                  </p>
                  {typeof f.progress === 'number' && f.status !== 'done' ? (
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.max(0, f.progress))}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  {f.status === 'uploading' || f.status === 'processing' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
                  ) : null}
                  {f.status === 'done' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : null}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(f.id);
                    }}
                    className="rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
                    aria-label={`Remove ${f.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
