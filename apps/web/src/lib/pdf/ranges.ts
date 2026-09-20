export interface ParsedRanges {
  /** Zero-based page indices, sorted ascending and de-duplicated. */
  indices: number[];
  /** Human-readable error message when parsing failed. */
  error?: string;
}

/**
 * Parse a human-friendly page range string into zero-based page indices.
 *
 * Supported syntax (1-based, inclusive):
 *   "1-3, 5, 8-"  -> pages 1,2,3,5,8..end
 *   "3"           -> page 3
 *   "-4"          -> pages 1..4
 *   ""            -> all pages
 *
 * @param input  Raw range string typed by the user.
 * @param total  Total number of pages in the document.
 */
export function parsePageRanges(input: string, total: number): ParsedRanges {
  const safeTotal = Math.max(0, Math.floor(total));
  const trimmed = (input ?? '').trim();

  if (safeTotal === 0) {
    return { indices: [], error: 'Document has no pages.' };
  }

  if (trimmed === '') {
    return { indices: buildRange(1, safeTotal) };
  }

  const tokens = trimmed
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return { indices: buildRange(1, safeTotal) };
  }

  const collected = new Set<number>();

  for (const token of tokens) {
    const match = token.match(/^(\d+)?\s*-\s*(\d+)?$/);

    if (match) {
      const [, rawStart, rawEnd] = match;
      const start = rawStart ? parseInt(rawStart, 10) : 1;
      const end = rawEnd ? parseInt(rawEnd, 10) : safeTotal;

      if (Number.isNaN(start) || Number.isNaN(end)) {
        return { indices: [], error: `Invalid range: "${token}"` };
      }
      if (start < 1 || end < 1) {
        return { indices: [], error: 'Page numbers start at 1.' };
      }
      if (start > end) {
        return { indices: [], error: `Range "${token}" is reversed.` };
      }
      if (start > safeTotal) {
        return { indices: [], error: `Page ${start} exceeds document length (${safeTotal}).` };
      }

      const clampedEnd = Math.min(end, safeTotal);
      for (let p = start; p <= clampedEnd; p += 1) collected.add(p - 1);
      continue;
    }

    if (/^\d+$/.test(token)) {
      const page = parseInt(token, 10);
      if (page < 1) return { indices: [], error: 'Page numbers start at 1.' };
      if (page > safeTotal) {
        return { indices: [], error: `Page ${page} exceeds document length (${safeTotal}).` };
      }
      collected.add(page - 1);
      continue;
    }

    return { indices: [], error: `Unrecognized token: "${token}"` };
  }

  const indices = Array.from(collected).sort((a, b) => a - b);
  if (indices.length === 0) {
    return { indices: [], error: 'No pages selected.' };
  }
  return { indices };
}

/** Build a zero-based index array for an inclusive 1-based range. */
function buildRange(start: number, end: number): number[] {
  const out: number[] = [];
  for (let p = start; p <= end; p += 1) out.push(p - 1);
  return out;
}

/**
 * Format a set of zero-based indices back into a compact range string.
 * e.g. [0,1,2,4,6,7] -> "1-3, 5, 7-8"
 */
export function formatPageRanges(indices: number[]): string {
  if (!indices.length) return '';
  const sorted = Array.from(new Set(indices)).sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i += 1) {
    const current = sorted[i];
    if (current !== prev + 1) {
      parts.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
      start = current;
    }
    prev = current;
  }

  return parts.join(', ');
}

/** Quick presets used by the range selector UI. */
export type RangePreset = 'all' | 'odd' | 'even' | 'first' | 'last';

export function presetToIndices(preset: RangePreset, total: number): number[] {
  const safeTotal = Math.max(0, Math.floor(total));
  if (safeTotal === 0) return [];
  switch (preset) {
    case 'all':
      return buildRange(1, safeTotal);
    case 'odd':
      return buildRange(1, safeTotal).filter((i) => i % 2 === 0);
    case 'even':
      return buildRange(1, safeTotal).filter((i) => i % 2 === 1);
    case 'first':
      return [0];
    case 'last':
      return [safeTotal - 1];
    default:
      return [];
  }
}
