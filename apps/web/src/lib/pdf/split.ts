import { PDFDocument } from 'pdf-lib';

export type SplitMode = 'ranges' | 'every-n' | 'individual';

export interface SplitRange {
  /** 1-based start page (inclusive). */
  from: number;
  /** 1-based end page (inclusive). */
  to: number;
}

export interface SplitOptions {
  mode?: SplitMode;
  /** Used when mode === 'ranges'. */
  ranges?: SplitRange[];
  /** Used when mode === 'every-n'. */
  everyN?: number;
  /** Progress callback with a value between 0 and 1. */
  onProgress?: (progress: number) => void;
}

export interface SplitOutput {
  name: string;
  bytes: Uint8Array;
  pageCount: number;
}

export interface SplitResult {
  outputs: SplitOutput[];
  sourcePageCount: number;
}

async function loadDocument(
  source: File | Blob | ArrayBuffer | Uint8Array,
): Promise<PDFDocument> {
  let data: ArrayBuffer | Uint8Array;
  if (source instanceof Uint8Array) data = source;
  else if (source instanceof ArrayBuffer) data = source;
  else data = await (source as Blob).arrayBuffer();
  return PDFDocument.load(data, { ignoreEncryption: true, updateMetadata: false });
}

function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, '') || 'document';
}

function clampRange(range: SplitRange, total: number): SplitRange | null {
  const from = Math.max(1, Math.min(total, Math.floor(range.from)));
  const to = Math.max(1, Math.min(total, Math.floor(range.to)));
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
  return { from, to };
}

function buildRanges(
  mode: SplitMode,
  ranges: SplitRange[] | undefined,
  everyN: number | undefined,
  total: number,
): SplitRange[] {
  if (mode === 'individual') {
    return Array.from({ length: total }, (_, i) => ({ from: i + 1, to: i + 1 }));
  }
  if (mode === 'every-n') {
    const n = Math.max(1, Math.floor(everyN ?? 1));
    const out: SplitRange[] = [];
    for (let start = 1; start <= total; start += n) {
      out.push({ from: start, to: Math.min(total, start + n - 1) });
    }
    return out;
  }
  const cleaned = (ranges ?? [])
    .map((r) => clampRange(r, total))
    .filter((r): r is SplitRange => r !== null);
  return cleaned;
}

/**
 * Split a PDF entirely in the browser using pdf-lib.
 * Supports explicit page ranges, fixed-size chunks, or one file per page.
 */
export async function splitPdf(
  source: File | Blob | ArrayBuffer | Uint8Array,
  options: SplitOptions = {},
): Promise<SplitResult> {
  const { mode = 'ranges', ranges, everyN, onProgress } = options;

  onProgress?.(0.05);
  const srcDoc = await loadDocument(source);
  onProgress?.(0.2);

  const total = srcDoc.getPageCount();
  const sourceName =
    typeof File !== 'undefined' && source instanceof File ? source.name : 'document.pdf';
  const stem = baseName(sourceName);

  const plan = buildRanges(mode, ranges, everyN, total);
  if (plan.length === 0) {
    throw new Error('No valid page ranges to split.');
  }

  const outputs: SplitOutput[] = [];
  for (let i = 0; i < plan.length; i += 1) {
    const { from, to } = plan[i];
    const outDoc = await PDFDocument.create();
    const indices = Array.from({ length: to - from + 1 }, (_, k) => from - 1 + k);
    const copied = await outDoc.copyPages(srcDoc, indices);
    copied.forEach((p) => outDoc.addPage(p));

    const bytes = await outDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false,
    });

    const label = from === to ? `page-${from}` : `pages-${from}-${to}`;
    outputs.push({
      name: `${stem}-${label}.pdf`,
      bytes,
      pageCount: indices.length,
    });

    const step = 0.2 + ((i + 1) / plan.length) * 0.75;
    onProgress?.(Math.min(0.98, step));
  }

  onProgress?.(1);
  return { outputs, sourcePageCount: total };
}

/**
 * Parse a human-friendly range string like "1-3, 5, 8-10" into SplitRange[].
 * Returns null entries for malformed tokens so callers can surface errors.
 */
export function parseRangeString(input: string): SplitRange[] {
  if (!input) return [];
  return input
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const m = chunk.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
      if (!m) return null;
      const from = parseInt(m[1], 10);
      const to = m[2] ? parseInt(m[2], 10) : from;
      return { from, to };
    })
    .filter((r): r is SplitRange => r !== null);
}

export { PDFDocument };
