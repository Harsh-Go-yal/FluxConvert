/**
 * Render an HTML fragment to a paginated A4 PDF, entirely in the browser.
 *
 * The markup is written into an off-screen iframe so the page's own styles
 * cannot leak in, images are awaited, then jsPDF paginates the result.
 * Used by both "Word to PDF" (via mammoth) and "HTML to PDF".
 */

const PRINT_STYLES = `
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
    width: 800px;
    background: #fff;
  }
  h1, h2, h3, h4 { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 1em 0 0.4em; }
  p { margin: 0 0 0.8em; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 1em; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
  th { background: #f1f1f1; }
  img { max-width: 100%; height: auto; }
  ul, ol { margin: 0 0 0.8em 1.4em; }
  pre, code { font-family: 'Courier New', monospace; font-size: 10pt; }
`;

/** Wait for every image in the document to settle, so none render blank. */
function waitForImages(doc: Document): Promise<void> {
    const images = Array.from(doc.images);
    if (images.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
        let remaining = images.length;
        const done = () => {
            remaining -= 1;
            if (remaining <= 0) resolve();
        };
        for (const image of images) {
            if (image.complete) done();
            else {
                image.addEventListener('load', done, { once: true });
                image.addEventListener('error', done, { once: true });
            }
        }
        // Never hang on an image that neither loads nor errors.
        setTimeout(resolve, 10000);
    });
}

export async function htmlToPdfBlob(html: string): Promise<Blob> {
    if (typeof document === 'undefined') {
        throw new Error('PDF rendering is only available in the browser.');
    }
    if (!html || !html.trim()) {
        throw new Error('There is no content to convert.');
    }

    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
    ]);

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '800px';
    iframe.style.height = '1200px';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) throw new Error('Could not prepare the page for rendering.');

        // If the source is a whole document, keep only its body content.
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const content = bodyMatch ? bodyMatch[1] : html;

        doc.open();
        doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>${PRINT_STYLES}</style></head><body>${content}</body></html>`);
        doc.close();

        await waitForImages(doc);

        const pdf = new jsPDF('p', 'mm', 'a4');
        // jsPDF's html() comes from its optional html module, which is not in the base types.
        const renderer = pdf as unknown as {
            html: (source: HTMLElement, options: Record<string, unknown>) => void;
        };

        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(
                () => reject(new Error('Rendering this document took too long.')),
                120000,
            );
            renderer.html(doc.body, {
                callback: () => {
                    clearTimeout(timer);
                    resolve();
                },
                x: 10,
                y: 10,
                width: 190, // A4 width (210mm) minus 10mm margins
                windowWidth: 800,
                html2canvas,
                autoPaging: 'text',
            });
        });

        const blob = pdf.output('blob');
        if (!blob || blob.size === 0) throw new Error('The converted PDF came out empty.');
        return blob;
    } finally {
        iframe.remove();
    }
}

/** Convert a .html/.htm/.txt file to PDF. */
export async function htmlFileToPdf(file: File): Promise<Blob> {
    const text = await file.text();
    const looksLikeHtml = /<[a-z][\s\S]*>/i.test(text);
    return htmlToPdfBlob(
        looksLikeHtml ? text : `<pre>${text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))}</pre>`,
    );
}
