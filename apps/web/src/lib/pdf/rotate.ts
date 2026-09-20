import { PDFDocument, degrees } from 'pdf-lib';

export type RotationAngle = 0 | 90 | 180 | 270;

export interface RotateOptions {
  /** Rotation applied to every page when no per-page map is provided. */
  angle?: RotationAngle;
  /** Optional per-page rotation overrides keyed by 1-based page number. */
  pageAngles?: Record<number, RotationAngle>;
  /** Progress callback with a value between 0 and 1. */
  onProgress?: (progress: number) => void;
}

export interface RotateResult {
  bytes: Uint8Array;
  pageCount: number;
  name: string;
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

function normalizeAngle(angle: number): RotationAngle {
  const mod = ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
  return mod as RotationAngle;
}

/**
 * Rotate pages of a PDF entirely in the browser using pdf-lib.
 * Supports a uniform angle for all pages or per-page overrides.
 */
export async function rotatePdf(
  source: File | Blob | ArrayBuffer | Uint8Array,
  options: RotateOptions = {},
): Promise<RotateResult> {
  const { angle = 90, pageAngles, onProgress } = options;

  onProgress?.(0.05);
  const doc = await loadDocument(source);
  onProgress?.(0.25);

  const pages = doc.getPages();
  const total = pages.length;
  const uniform = normalizeAngle(angle);

  for (let i = 0; i < total; i += 1) {
    const page = pages[i];
    const override = pageAngles?.[i + 1];
    const delta = override !== undefined ? normalizeAngle(override) : uniform;
    const current = page.getRotation().angle ?? 0;
    page.setRotation(degrees(normalizeAngle(current + delta)));

    const step = 0.25 + ((i + 1) / total) * 0.65;
    onProgress?.(Math.min(0.95, step));
  }

  const bytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });

  onProgress?.(1);

  const sourceName =
    typeof File !== 'undefined' && source instanceof File ? source.name : 'document.pdf';

  return {
    bytes,
    pageCount: total,
    name: `${baseName(sourceName)}-rotated.pdf`,
  };
}

export { PDFDocument, degrees };
