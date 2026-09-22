/**
 * Render an HTML fragment to a paginated A4 PDF, entirely in the browser.
 *
 * The markup is written into an off-screen iframe, rasterised with html2canvas,
 * and sliced into A4 pages. Used by "Word to PDF" (via mammoth) and "HTML to PDF".
 *
 * Why not jsPDF's built-in `.html()` helper: it clones the *host* document, so
 * html2canvas ends up parsing the app's own stylesheet. Tailwind v4 emits
 * `oklch()` colours, which html2canvas cannot parse — it throws
 * "Attempting to parse an unsupported color function" and the promise never
 * settles, leaving the UI stuck on "Rendering PDF..." forever. Rendering the
 * iframe ourselves keeps the styles self-contained (plain hex only) and lets us
 * enforce a timeout.
 */

const PRINT_STYLES = `
  html, body { background: #ffffff; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #333333;
    margin: 0;
    padding: 24px;
    width: 800px;
    box-sizing: border-box;
  }
  h1, h2, h3, h4 { font-family: Arial, Helvetica, sans-serif; color: #111111; margin: 1em 0 0.4em; }
  p { margin: 0 0 0.8em; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 1em; }
  th, td { border: 1px solid #999999; padding: 6px 8px; text-align: left; }
  th { background: #f1f1f1; }
  img { max-width: 100%; height: auto; }
  ul, ol { margin: 0 0 0.8em 1.4em; }
  pre, code { font-family: 'Courier New', monospace; font-size: 10pt; white-space: pre-wrap; }
  a { color: #1a4fa0; }
`;

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 10;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - MARGIN_MM * 2;
const RENDER_WIDTH_PX = 800;

/** Wait for every image to settle, so none render blank. */
function waitForImages(doc: Document, timeoutMs = 10000): Promise<void> {
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
        setTimeout(resolve, timeoutMs);
    });
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(message)), ms);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            },
        );
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
    iframe.style.cssText =
        'position:absolute;left:-10000px;top:0;width:800px;height:1200px;border:0;visibility:hidden;';
    document.body.appendChild(iframe);

    try {
        const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!frameDoc) throw new Error('Could not prepare the page for rendering.');

        // If the source is a whole document, keep only its body content.
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const content = bodyMatch ? bodyMatch[1] : html;

        frameDoc.open();
        frameDoc.write(
            `<!doctype html><html><head><meta charset="utf-8"><style>${PRINT_STYLES}</style></head><body>${content}</body></html>`,
        );
        frameDoc.close();

        await waitForImages(frameDoc);
        // Let the iframe lay out before measuring.
        await new Promise((resolve) => setTimeout(resolve, 50));

        const body = frameDoc.body;
        const fullHeight = Math.max(body.scrollHeight, body.offsetHeight, 1);
        iframe.style.height = `${fullHeight}px`;

        const canvas = await withTimeout(
            html2canvas(body, {
                backgroundColor: '#ffffff',
                scale: 2,
                width: RENDER_WIDTH_PX,
                height: fullHeight,
                windowWidth: RENDER_WIDTH_PX,
                windowHeight: fullHeight,
                useCORS: true,
                logging: false,
            }),
            90000,
            'Rendering this document took too long.',
        );

        if (!canvas.width || !canvas.height) throw new Error('The document rendered as an empty page.');

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        // How many canvas pixels fit on one page, preserving the aspect ratio.
        const pxPerMm = canvas.width / CONTENT_WIDTH_MM;
        const pageHeightPx = Math.floor(CONTENT_HEIGHT_MM * pxPerMm);
        const pageCount = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

        for (let page = 0; page < pageCount; page++) {
            const sliceTop = page * pageHeightPx;
            const sliceHeight = Math.min(pageHeightPx, canvas.height - sliceTop);
            if (sliceHeight <= 0) break;

            const slice = document.createElement('canvas');
            slice.width = canvas.width;
            slice.height = sliceHeight;
            const context = slice.getContext('2d');
            if (!context) throw new Error('Could not create a drawing surface.');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, slice.width, slice.height);
            context.drawImage(canvas, 0, sliceTop, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

            if (page > 0) pdf.addPage();
            pdf.addImage(
                slice.toDataURL('image/jpeg', 0.92),
                'JPEG',
                MARGIN_MM,
                MARGIN_MM,
                CONTENT_WIDTH_MM,
                sliceHeight / pxPerMm,
            );
        }

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
    const escaped = text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] as string);
    return htmlToPdfBlob(looksLikeHtml ? text : `<pre>${escaped}</pre>`);
}
