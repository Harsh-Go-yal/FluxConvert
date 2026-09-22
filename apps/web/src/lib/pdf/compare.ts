/**
 * Compare two PDFs by their text content and report what changed, page by page.
 *
 * Uses a word-level longest-common-subsequence diff, which is what makes the
 * output readable: it marks the words that actually moved rather than flagging
 * a whole paragraph because one character changed.
 */

export type DiffKind = 'equal' | 'added' | 'removed';

export interface DiffPart {
  kind: DiffKind;
  text: string;
}

export interface PageComparison {
  page: number;
  /** 'same' when the text is identical after whitespace normalisation. */
  status: 'same' | 'changed' | 'only-in-a' | 'only-in-b';
  parts: DiffPart[];
  addedWords: number;
  removedWords: number;
}

export interface CompareResult {
  pages: PageComparison[];
  pageCountA: number;
  pageCountB: number;
  changedPages: number;
  identical: boolean;
}

async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  return pdfjs;
}

async function extractPages(file: File | Blob): Promise<string[]> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await loadingTask.promise;
  const pages: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await doc.getPage(i).then((p) => p.getTextContent());
      pages.push(
        content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      );
    }
  } finally {
    await loadingTask.destroy();
  }
  return pages;
}

/** Word-level diff via a longest-common-subsequence table. */
export function diffWords(a: string, b: string): DiffPart[] {
  const left = a ? a.split(/\s+/) : [];
  const right = b ? b.split(/\s+/) : [];

  // Guard against pathological inputs: the table is O(n*m).
  const LIMIT = 4000;
  if (left.length > LIMIT || right.length > LIMIT) {
    return [
      { kind: 'removed', text: left.join(' ') },
      { kind: 'added', text: right.join(' ') },
    ].filter((part) => part.text.length > 0) as DiffPart[];
  }

  const table: number[][] = Array.from({ length: left.length + 1 }, () =>
    new Array(right.length + 1).fill(0),
  );
  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      table[i][j] =
        left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  const push = (kind: DiffKind, word: string) => {
    const last = parts[parts.length - 1];
    if (last && last.kind === kind) last.text += ` ${word}`;
    else parts.push({ kind, text: word });
  };

  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      push('equal', left[i]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      push('removed', left[i++]);
    } else {
      push('added', right[j++]);
    }
  }
  while (i < left.length) push('removed', left[i++]);
  while (j < right.length) push('added', right[j++]);
  return parts;
}

export async function comparePdfs(fileA: File, fileB: File): Promise<CompareResult> {
  const [pagesA, pagesB] = await Promise.all([extractPages(fileA), extractPages(fileB)]);
  const total = Math.max(pagesA.length, pagesB.length);
  const pages: PageComparison[] = [];

  for (let i = 0; i < total; i++) {
    const a = pagesA[i];
    const b = pagesB[i];

    if (a === undefined) {
      pages.push({
        page: i + 1,
        status: 'only-in-b',
        parts: [{ kind: 'added', text: b }],
        addedWords: b ? b.split(/\s+/).length : 0,
        removedWords: 0,
      });
      continue;
    }
    if (b === undefined) {
      pages.push({
        page: i + 1,
        status: 'only-in-a',
        parts: [{ kind: 'removed', text: a }],
        addedWords: 0,
        removedWords: a ? a.split(/\s+/).length : 0,
      });
      continue;
    }

    if (a === b) {
      pages.push({ page: i + 1, status: 'same', parts: [{ kind: 'equal', text: a }], addedWords: 0, removedWords: 0 });
      continue;
    }

    const parts = diffWords(a, b);
    pages.push({
      page: i + 1,
      status: 'changed',
      parts,
      addedWords: parts.filter((p) => p.kind === 'added').reduce((n, p) => n + p.text.split(/\s+/).length, 0),
      removedWords: parts.filter((p) => p.kind === 'removed').reduce((n, p) => n + p.text.split(/\s+/).length, 0),
    });
  }

  const changedPages = pages.filter((p) => p.status !== 'same').length;
  return {
    pages,
    pageCountA: pagesA.length,
    pageCountB: pagesB.length,
    changedPages,
    identical: changedPages === 0,
  };
}

/** A standalone HTML report of the comparison, ready to download. */
export function comparisonToHtml(result: CompareResult, nameA: string, nameB: string): string {
  const escape = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const body = result.pages
    .map((page) => {
      const marks = page.parts
        .map((part) =>
          part.kind === 'equal'
            ? escape(part.text)
            : `<span class="${part.kind}">${escape(part.text)}</span>`,
        )
        .join(' ');
      return `<section><h2>Page ${page.page} <small>${page.status.replace(/-/g, ' ')}${
        page.status === 'changed' ? ` · +${page.addedWords} / −${page.removedWords} words` : ''
      }</small></h2><p>${marks || '<em>(no text on this page)</em>'}</p></section>`;
    })
    .join('\n');

  return `<!doctype html><html><head><meta charset="utf-8"><title>PDF comparison</title><style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 32px; color: #111; line-height: 1.6; }
    h1 { margin-bottom: 4px; } .meta { color: #666; margin-bottom: 28px; }
    section { border-top: 1px solid #eee; padding-top: 16px; margin-top: 16px; }
    h2 { font-size: 16px; margin: 0 0 8px; } h2 small { font-weight: 400; color: #666; }
    .added { background: #d7f5dd; text-decoration: none; }
    .removed { background: #ffd9d9; text-decoration: line-through; }
    p { white-space: pre-wrap; word-break: break-word; }
  </style></head><body>
    <h1>PDF comparison</h1>
    <div class="meta">
      <div><strong>A:</strong> ${escape(nameA)} — ${result.pageCountA} page(s)</div>
      <div><strong>B:</strong> ${escape(nameB)} — ${result.pageCountB} page(s)</div>
      <div>${result.identical ? 'The text is identical.' : `${result.changedPages} page(s) differ. Green was added in B, struck-through red was removed from A.`}</div>
    </div>
    ${body}
  </body></html>`;
}
