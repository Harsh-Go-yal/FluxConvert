"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import { PdfService } from '@/services/pdf-service';
import { ArrowDown, ArrowUp, Download, FileImage, Loader2, Sparkles } from 'lucide-react';
import { Dropzone, type DropzoneFile } from '@/components/dropzone';
import { useToast } from '@/components/ui/toast';
import { formatBytes } from '@flux/utils';

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function ImageToPdfPage() {
  const { toast } = useToast();
  const [files, setFiles] = React.useState<DropzoneFile[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [resultSize, setResultSize] = React.useState<number>(0);

  const addFiles = React.useCallback((incoming: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...incoming.map((file) => ({ id: uid(), file, status: 'idle' as const })),
    ]);
  }, []);

  const removeFile = React.useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const move = React.useCallback((id: string, dir: -1 | 1) => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }, []);

  const convert = React.useCallback(async () => {
    if (!files.length) {
      toast({ title: 'Add at least one image', variant: 'error' });
      return;
    }
    setBusy(true);
    setResultUrl(null);
    try {
      // One shared implementation (validates PNG/JPEG and reports unsupported files clearly).
      setFiles((prev) => prev.map((x) => ({ ...x, status: 'processing' as const, progress: 20 })));
      const blob = await PdfService.imageToPdf(files.map((f) => f.file));
      setFiles((prev) => prev.map((x) => ({ ...x, status: 'done' as const, progress: 100 })));

      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize(blob.size);
      toast({
        title: 'PDF Created Successfully!',
        description: `${files.length} images combined (${formatBytes(blob.size)})`,
        variant: 'success',
      });
    } catch (err: unknown) {
      setFiles((prev) => prev.map((x) => ({ ...x, status: 'error' as const })));
      toast({
        title: 'Conversion failed',
        description:
          err instanceof Error && err.message ? err.message : 'Unsupported image format',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  }, [files, toast]);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-4xl flex-col px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Client-Side Fast & Private
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Image to PDF Converter
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Convert JPG and PNG images into a single PDF document entirely in your browser.
        </p>
      </motion.div>

      <div className="mt-8 space-y-6">
        <Dropzone
          accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
          files={files}
          onFilesAdded={addFiles}
          onRemove={removeFile}
          hint="JPG, PNG, WEBP up to 50MB each"
        />

        {files.length > 1 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Reorder pages:</p>
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div
                  key={f.id}
                  className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-foreground"
                >
                  <span className="font-mono text-muted-foreground">{i + 1}.</span>
                  <span className="max-w-[120px] truncate">{f.file.name}</span>
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(f.id, -1)}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    disabled={i === files.length - 1}
                    onClick={() => move(f.id, 1)}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
          <p className="text-xs text-muted-foreground">
            {files.length} {files.length === 1 ? 'image' : 'images'} selected
          </p>
          <div className="flex items-center gap-3">
            {resultUrl ? (
              <a
                href={resultUrl}
                download="converted.pdf"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
              >
                <Download className="h-4 w-4" /> Download PDF ({formatBytes(resultSize)})
              </a>
            ) : null}
            <button
              type="button"
              disabled={busy || files.length === 0}
              onClick={convert}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
              {busy ? 'Generating PDF...' : 'Convert to PDF'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
