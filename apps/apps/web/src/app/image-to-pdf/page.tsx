"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';
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
      const pdf = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setFiles((prev) =>
          prev.map((x) => (x.id === f.id ? { ...x, status: 'processing', progress: 20 } : x)),
        );
        const bytes = new Uint8Array(await f.file.arrayBuffer());
        const type = f.file.type.toLowerCase();
        let image;
        if (type.includes('png')) {
          image = await pdf.embedPng(bytes);
        } else if (type.includes('jpeg') || type.includes('jpg')) {
          image = await pdf.embedJpg(bytes);
        } else {
          // Fallback: draw via canvas to PNG
          const bitmap = await createImageBitmap(f.file);
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas 2D context unavailable');
          ctx.drawImage(bitmap, 0, 0);
          const blob: Blob = await new Promise((resolve, reject) =>
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
          );
          const pngBytes = new Uint8Array(await blob.arrayBuffer());
          image = await pdf.embedPng(pngBytes);
        }
        const page = pdf.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        setFiles((prev) =>
          prev.map((x) => (x.id === f.id ? { ...x, status: 'done', progress: 100 } : x)),
        );
      }
      const out = await pdf.save();
      const blob = new Blob([out], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize(blob.size);
      toast({ title: 'PDF ready', description: `${files.length} page(s) generated`, variant: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Conversion failed';
      toast({ title: 'Conversion failed', description: message, variant: 'error' });
      setFiles((prev) => prev.map((x) => ({ ...x, status: 'error', error: message })));
    } finally {
      setBusy(false);
    }
  }, [files, toast]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 flex items-center gap-3"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/30">
          <FileImage className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Image to PDF</h1>
          <p className="text-sm text-white/60">Combine PNG, JPG, or WebP images into a single PDF.</p>
        </div>
      </motion.div>

      <Dropzone
        accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'] }}
        files={files}
        onFilesAdded={addFiles}
        onRemove={removeFile}
        hint="PNG, JPG, WebP up to 100 MB each"
      />

      {files.length > 0 ? (
        <div className="mt-6 space-y-2">
          {files.map((f, idx) => (
            <motion.div
              key={f.id}
              layout
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <span className="w-6 text-center text-xs text-white/50">{idx + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{f.file.name}</p>
                <p className="text-xs text-white/50">{formatBytes(f.file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => move(f.id, -1)}
                disabled={idx === 0}
                className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                aria-label="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(f.id, 1)}
                disabled={idx === files.length - 1}
                className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                aria-label="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <motion.button
          type="button"
          onClick={convert}
          disabled={busy || files.length === 0}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? 'Generating…' : 'Generate PDF'}
        </motion.button>

        {resultUrl ? (
          <motion.a
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            href={resultUrl}
            download="images.pdf"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <Download className="h-4 w-4" />
            Download PDF ({formatBytes(resultSize)})
          </motion.a>
        ) : null}
      </div>
    </main>
  );
}
