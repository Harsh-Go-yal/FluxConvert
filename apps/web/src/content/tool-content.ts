/**
 * Per-tool page copy.
 *
 * Every tool page used to render the same three generic steps and the same two
 * feature blurbs, which left 31 near-duplicate pages competing with each other
 * in search. Each tool now has its own title, description, intro, steps and
 * FAQs — the FAQs also feed FAQPage structured data, and `related` builds the
 * internal links that spread authority between tool pages.
 *
 * Keep entries factual: describe only what the tool actually does today.
 */

export interface ToolFaq {
    question: string;
    answer: string;
}

export interface ToolContent {
    /** <title>. Aim for under 60 characters so it is not truncated in results. */
    metaTitle: string;
    /** Meta description. Aim for 140-160 characters. */
    metaDescription: string;
    /** One or two sentences under the H1. */
    intro: string;
    /** Concrete steps for this tool, used for the HowTo structured data. */
    steps: { title: string; detail: string }[];
    faqs: ToolFaq[];
    /** Tool ids to cross-link at the bottom of the page. */
    related: string[];
    /** Extra keyword variations for the metadata. */
    keywords?: string[];
}

const PRIVACY_ANSWER =
    'No. This tool runs entirely inside your browser using WebAssembly and JavaScript — your file is never uploaded to a server, so nobody else can see it. You can even disconnect from the internet after the page loads and it will still work.';

export const toolContent: Record<string, ToolContent> = {
    'merge-pdf': {
        metaTitle: 'Merge PDF — Combine PDF Files Online Free',
        metaDescription:
            'Combine two or more PDFs into one document, in the order you choose. Free, no sign-up, no watermark, and your files never leave your browser.',
        intro:
            'Combine several PDFs into a single document while keeping the original page quality, text and links intact. Drag the files into the order you want before merging.',
        steps: [
            { title: 'Add your PDFs', detail: 'Select or drop two or more PDF files. Each one appears in the list below the drop area.' },
            { title: 'Put them in order', detail: 'The files merge top to bottom, so arrange them the way the final document should read.' },
            { title: 'Merge and download', detail: 'Press Process and the combined PDF downloads straight away — no email, no waiting room.' },
        ],
        faqs: [
            { question: 'Are my files uploaded to a server?', answer: PRIVACY_ANSWER },
            { question: 'How many PDFs can I merge at once?', answer: 'There is no fixed limit — merging is bounded by your device memory. Dozens of ordinary documents merge comfortably on a modern phone or laptop.' },
            { question: 'Does merging reduce quality?', answer: 'No. Pages are copied across exactly as they are, so text stays selectable and images keep their original resolution. The merged file is roughly the sum of the originals.' },
            { question: 'Can I merge a password-protected PDF?', answer: 'You need to remove the password first — use Unlock PDF, then merge the unlocked copy.' },
        ],
        related: ['split-pdf', 'organize-pdf', 'compress-pdf', 'extract-pages'],
        keywords: ['combine pdf', 'join pdf files', 'pdf merger'],
    },

    'split-pdf': {
        metaTitle: 'Split PDF — Extract Pages Into a New File',
        metaDescription:
            'Split a PDF by page range or pull out a single section into its own file. Runs in your browser, free, with no watermark and no upload.',
        intro:
            'Pull a page range out of a PDF into its own document. Useful for sending one chapter, one invoice or one signed page instead of the whole file.',
        steps: [
            { title: 'Add the PDF', detail: 'Drop in the document you want to split.' },
            { title: 'Choose the page range', detail: 'Set the first and last page to keep. The range is inclusive, so 2 to 5 keeps four pages.' },
            { title: 'Download the new PDF', detail: 'The selected range is saved as a fresh document; your original file is untouched.' },
        ],
        faqs: [
            { question: 'Are my files uploaded to a server?', answer: PRIVACY_ANSWER },
            { question: 'Can I split one PDF into many separate files?', answer: 'Yes — Extract Pages lets you pick any combination of pages, and splitting every page into its own file returns them together in a ZIP.' },
            { question: 'Does the original file change?', answer: 'Never. The tool writes a new document and leaves the file on your device exactly as it was.' },
            { question: 'Will bookmarks and links survive?', answer: 'Links inside the pages you keep are preserved. Bookmarks pointing at pages outside the range are dropped, because their targets no longer exist.' },
        ],
        related: ['merge-pdf', 'extract-pages', 'remove-pages', 'organize-pdf'],
        keywords: ['pdf splitter', 'separate pdf pages', 'cut pdf'],
    },

    'remove-pages': {
        metaTitle: 'Delete Pages From a PDF Online Free',
        metaDescription:
            'Remove unwanted pages from a PDF in seconds. Click page thumbnails or type a range, then download the cleaned-up document. Nothing is uploaded.',
        intro:
            'Delete the pages you do not need — blank scans, cover sheets, duplicated pages — and keep everything else exactly as it was.',
        steps: [
            { title: 'Add the PDF', detail: 'Page thumbnails are rendered so you can see what you are removing.' },
            { title: 'Pick the pages to delete', detail: 'Click thumbnails to toggle them, or type a range such as 1, 4-6.' },
            { title: 'Download the result', detail: 'The remaining pages keep their original order and quality.' },
        ],
        faqs: [
            { question: 'Are my files uploaded to a server?', answer: PRIVACY_ANSWER },
            { question: 'Can I undo a deletion?', answer: 'Your original file is never modified, so simply run the tool again with a different selection.' },
            { question: 'Why must at least one page remain?', answer: 'A PDF with no pages is not a valid document and most readers refuse to open it, so the tool asks you to keep at least one.' },
            { question: 'Does removing pages shrink the file?', answer: 'Usually, yes — the removed pages take their images and fonts with them. Run Compress PDF afterwards if you need to go smaller still.' },
        ],
        related: ['extract-pages', 'split-pdf', 'organize-pdf', 'compress-pdf'],
        keywords: ['delete pdf pages', 'remove page from pdf'],
    },

    'extract-pages': {
        metaTitle: 'Extract Pages From PDF — Free Page Picker',
        metaDescription:
            'Select exactly the pages you want and save them as a new PDF. Pick from thumbnails or type a range like 1-3, 7. Free and fully private.',
        intro:
            'Build a new PDF from any combination of pages. Unlike splitting, the pages do not have to be next to each other.',
        steps: [
            { title: 'Add the PDF', detail: 'Every page is rendered as a thumbnail you can click.' },
            { title: 'Select the pages to keep', detail: 'Click the pages you want, or type a range such as 1-3, 7, 12.' },
            { title: 'Save the new document', detail: 'The chosen pages are written to a new PDF in the order they appear in the original.' },
        ],
        faqs: [
            { question: 'Are my files uploaded to a server?', answer: PRIVACY_ANSWER },
            { question: 'What page-range syntax is supported?', answer: 'Single pages (5), ranges (2-6), open-ended ranges (8-) and any combination separated by commas. Page numbers start at 1.' },
            { question: 'How is this different from Split PDF?', answer: 'Split takes one continuous range. Extract lets you cherry-pick scattered pages — for example pages 1, 4 and 9 — into a single new file.' },
            { question: 'Can I reorder the extracted pages?', answer: 'Extraction keeps the original order. To rearrange them, run Organize PDF on the result.' },
        ],
        related: ['split-pdf', 'remove-pages', 'organize-pdf', 'merge-pdf'],
        keywords: ['pdf page extractor', 'save pdf pages'],
    },

    'organize-pdf': {
        metaTitle: 'Organize PDF — Reorder, Rotate and Delete Pages',
        metaDescription:
            'Rearrange PDF pages on a visual board: move, rotate or drop any page, then download the reorganised document. Free, private, no sign-up.',
        intro:
            'Rearrange a document visually. Move pages into a new order, rotate the ones that were scanned sideways and drop the ones you do not want — all in one pass.',
        steps: [
            { title: 'Add the PDF', detail: 'Every page appears as a thumbnail on a board.' },
            { title: 'Rearrange the pages', detail: 'Use the arrows to move a page, the rotate button for sideways scans, and the bin to drop a page (you can restore it).' },
            { title: 'Download the result', detail: 'The new document follows your board exactly, including rotations.' },
        ],
        faqs: [
            { question: 'Are my files uploaded to a server?', answer: PRIVACY_ANSWER },
            { question: 'Can I rotate a single page instead of all of them?', answer: 'Yes — rotation here is per page, which is what you want for a scan where only some sheets went in sideways. Rotate PDF turns every page at once.' },
            { question: 'Does reordering re-compress the pages?', answer: 'No. Pages are copied as-is, so text stays selectable and images keep their resolution.' },
            { question: 'Can I restore a page I removed by mistake?', answer: 'Yes. Removed pages stay on the board greyed out with an undo button until you download.' },
        ],
        related: ['merge-pdf', 'rotate-pdf', 'remove-pages', 'extract-pages'],
        keywords: ['rearrange pdf pages', 'reorder pdf', 'pdf page organizer'],
    },

    'scan-pdf': {
        metaTitle: 'Scan to PDF — Turn Photos Into a Document',
        metaDescription:
            'Use your phone camera to photograph pages and turn them into a clean, high-contrast PDF. Nothing is uploaded — the whole scan stays on your device.',
        intro:
            'Photograph a document with your camera and turn the pages into a PDF. An optional clean-up pass converts the photos to high-contrast greyscale so they read like a real scan.',
        steps: [
            { title: 'Start the camera', detail: 'Allow camera access, then capture each page. Photos are added to the list as you go.' },
            { title: 'Review the pages', detail: 'Remove any blurred shot and re-take it. You can also upload photos you took earlier instead.' },
            { title: 'Create the PDF', detail: 'Pages are cleaned up and written into a single document you can download.' },
        ],
        faqs: [
            { question: 'Do my photos leave my device?', answer: 'No. The camera stream and every captured frame stay in your browser — the PDF is assembled locally and never uploaded.' },
            { question: 'Why does my scan look black and white?', answer: 'The clean-up pass converts pages to greyscale and stretches the contrast so paper turns white and ink turns black. Untick it to keep the original colours.' },
            { question: 'Can I use photos from my gallery?', answer: 'Yes. Upload JPG or PNG photos instead of using the camera and they are processed the same way.' },
            { question: 'Why is the camera not starting?', answer: 'Browsers only allow camera access over HTTPS and after you grant permission. If you denied it, reset the permission in your browser settings and reload.' },
        ],
        related: ['image-to-pdf', 'ocr-pdf', 'compress-pdf', 'pdf-to-jpg'],
        keywords: ['document scanner', 'camera to pdf', 'phone scan pdf'],
    },

    'compress-pdf': {
        metaTitle: 'Compress PDF — Reduce PDF File Size Free',
        metaDescription:
            'Make a PDF smaller so it fits an email or upload limit. Strips bloated metadata and rewrites the file efficiently, right in your browser.',
        intro:
            'Shrink a PDF that is too large to email or upload. The tool removes metadata and rewrites the document structure efficiently while leaving your pages readable.',
        steps: [
            { title: 'Add the PDF', detail: 'Drop in the file you need to shrink.' },
            { title: 'Compress it', detail: 'The document is rebuilt with redundant data removed.' },
            { title: 'Check the result', detail: 'Download the smaller file and confirm it still looks right before sending it on.' },
        ],
        faqs: [
            { question: 'Are my files uploaded to a server?', answer: PRIVACY_ANSWER },
            { question: 'How much smaller will my file get?', answer: 'It depends on what is inside. Text-heavy documents with lots of metadata shrink noticeably; a PDF that is already just compressed photos has little left to remove.' },
            { question: 'Why did my file barely change?', answer: 'Its size is probably dominated by high-resolution images that are already compressed. Converting pages to images at a lower quality, or re-exporting the source document, will do more.' },
            { question: 'Does compressing lose quality?', answer: 'The structural clean-up is lossless — text and vector graphics are untouched.' },
        ],
        related: ['merge-pdf', 'compress-image', 'pdf-to-jpg', 'remove-pages'],
        keywords: ['reduce pdf size', 'pdf compressor', 'shrink pdf'],
    },

    'repair-pdf': {
        metaTitle: 'Repair PDF — Fix a Corrupted or Damaged File',
        metaDescription:
            'Rebuild a PDF that will not open. Parses the file leniently and writes a fresh, well-formed document. Free and private, nothing uploaded.',
        intro:
            'Try to rescue a PDF that other readers refuse to open. The file is parsed leniently and everything readable is written into a fresh, well-formed document.',
        steps: [
            { title: 'Add the damaged PDF', detail: 'Drop in the file that will not open.' },
            { title: 'Rebuild it', detail: 'Readable pages are recovered and written to a clean document with a valid structure.' },
            { title: 'Open the repaired file', detail: 'Check the pages are intact — some damage cannot be undone.' },
        ],
        faqs: [
            { question: 'Are my files uploaded to a server?', answer: PRIVACY_ANSWER },
            { question: 'What kinds of damage can be fixed?', answer: 'Broken cross-reference tables, trailing junk after the end of the file and damaged metadata are usually recoverable, because the page content itself is still intact.' },
            { question: 'What cannot be fixed?', answer: 'If the page data itself is truncated or overwritten — a half-finished download, for example — there is nothing left to recover and the tool will tell you so instead of producing an empty file.' },
            { question: 'Will the repaired file look the same?', answer: 'Yes, when recovery succeeds. Pages are copied across whole, so text stays selectable and images keep their resolution.' },
        ],
        related: ['compress-pdf', 'merge-pdf', 'pdf-to-pdfa', 'organize-pdf'],
        keywords: ['fix corrupted pdf', 'pdf recovery', 'damaged pdf'],
    },

    'ocr-pdf': {
        metaTitle: 'OCR PDF — Extract Text From a Scanned PDF',
        metaDescription:
            'Pull the text out of a scanned PDF. Uses the embedded text layer when there is one and falls back to on-device OCR when there is not.',
        intro:
            'Get the words out of a PDF. If the document already has a text layer it is read directly; if it is a scan, every page is rendered and recognised on your device.',
        steps: [
            { title: 'Add the PDF', detail: 'Works with both digital documents and photographed or scanned pages.' },
            { title: 'Let it read the pages', detail: 'Embedded text is extracted instantly. Scans go through optical character recognition, which takes a few seconds per page.' },
            { title: 'Download the text', detail: 'You get a plain text file with the content of each page, labelled by page number.' },
        ],
        faqs: [
            { question: 'Are my files uploaded to a server?', answer: 'No. Recognition runs in your browser with Tesseract compiled to WebAssembly, so the document and the recognised text both stay on your device.' },
            { question: 'Which languages are supported?', answer: 'English is recognised out of the box. Documents in other Latin-script languages often work but with more mistakes on accented characters.' },
            { question: 'Why is OCR slow on my file?', answer: 'Recognition is real image analysis and runs on your own processor, so a long scanned document takes a while. A PDF that already has a text layer returns almost instantly.' },
            { question: 'How accurate is it?', answer: 'Clean, straight, high-contrast scans read very well. Skewed pages, handwriting and low-resolution photos produce errors — run Scan to PDF first to improve contrast.' },
        ],
        related: ['scan-pdf', 'pdf-to-word', 'pdf-to-jpg', 'pdf-to-excel'],
        keywords: ['pdf text recognition', 'scanned pdf to text', 'ocr online'],
    },

    'image-to-pdf': {
        metaTitle: 'JPG to PDF — Convert Images to PDF Free',
        metaDescription:
            'Turn JPG and PNG images into a single PDF, in the order you choose. No upload, no watermark, no sign-up — it all happens in your browser.',
        intro:
            'Combine photos and screenshots into one PDF. Each image becomes a page sized to fit it exactly, so nothing is cropped or stretched.',
        steps: [
            { title: 'Add your images', detail: 'Select JPG or PNG files — as many as you like.' },
            { title: 'Set the page order', detail: 'Move images up or down until they are in the right sequence.' },
            { title: 'Create the PDF', detail: 'One page per image, at the image resolution, ready to download.' },
        ],
        faqs: [
            { question: 'Are my images uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Which image formats are supported?', answer: 'JPG and PNG, which are the two formats the PDF standard can embed directly. Convert HEIC or WebP images first, then bring them here.' },
            { question: 'Will the images lose quality?', answer: 'No. JPGs are embedded byte for byte, so the PDF contains the same pixels as your originals.' },
            { question: 'Can I put several photos on one page?', answer: 'Not yet — each image becomes its own page at its own size.' },
        ],
        related: ['pdf-to-jpg', 'scan-pdf', 'compress-image', 'compress-pdf'],
        keywords: ['png to pdf', 'photo to pdf', 'images to pdf converter'],
    },

    'word-to-pdf': {
        metaTitle: 'Word to PDF — Convert DOCX to PDF Free',
        metaDescription:
            'Convert a Word document to PDF so it looks the same everywhere. Runs in your browser — no upload, no account and no watermark.',
        intro:
            'Turn a .docx file into a PDF that renders identically on any device. Headings, paragraphs, lists, tables and images are laid out onto A4 pages.',
        steps: [
            { title: 'Add the Word file', detail: 'Drop in a .docx document.' },
            { title: 'Let it render', detail: 'The document is converted to formatted HTML and then rendered to paginated A4 pages.' },
            { title: 'Download the PDF', detail: 'Ready to email, print or archive.' },
        ],
        faqs: [
            { question: 'Is my document uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Does it support the older .doc format?', answer: 'No — only the modern .docx format. Open an old .doc in Word or Google Docs and save it as .docx first.' },
            { question: 'Why does my layout look slightly different?', answer: 'Conversion rebuilds the document from its content rather than replaying Word\'s own layout engine, so column widths and exotic fonts can shift a little. Text, order and tables are preserved.' },
            { question: 'Are fonts embedded?', answer: 'Pages are rendered before being written to the PDF, so the result looks the same everywhere without needing your fonts installed.' },
        ],
        related: ['pdf-to-word', 'excel-to-pdf', 'html-to-pdf', 'compress-pdf'],
        keywords: ['docx to pdf', 'doc to pdf converter'],
    },

    'powerpoint-to-pdf': {
        metaTitle: 'PowerPoint to PDF — Convert PPTX Slides',
        metaDescription:
            'Turn a PowerPoint presentation into a PDF for sharing and printing. Free and private — the file is processed inside your browser.',
        intro:
            'Convert a slide deck into a PDF so it can be shared, printed or attached without needing PowerPoint.',
        steps: [
            { title: 'Add the presentation', detail: 'Drop in a .pptx file.' },
            { title: 'Convert the slides', detail: 'Each slide becomes a page in the PDF.' },
            { title: 'Download the PDF', detail: 'Ready to hand out or archive.' },
        ],
        faqs: [
            { question: 'Is my presentation uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Will animations be preserved?', answer: 'No — PDF is a static format, so each slide is flattened to its final appearance. Transitions and builds are not part of a PDF.' },
            { question: 'What about speaker notes?', answer: 'Notes are not included; the PDF contains the slides themselves.' },
        ],
        related: ['pdf-to-powerpoint', 'word-to-pdf', 'excel-to-pdf', 'compress-pdf'],
        keywords: ['pptx to pdf', 'slides to pdf'],
    },

    'excel-to-pdf': {
        metaTitle: 'Excel to PDF — Convert XLSX Spreadsheets',
        metaDescription:
            'Convert an Excel spreadsheet into a readable PDF table, one page per sheet. Free, no sign-up, and your data never leaves the browser.',
        intro:
            'Turn a spreadsheet into a PDF that anyone can open. Each worksheet is laid out as a readable table with its own heading.',
        steps: [
            { title: 'Add the spreadsheet', detail: 'Drop in an .xlsx or .xls file.' },
            { title: 'Convert the sheets', detail: 'Every worksheet is written out as a table, starting a new page when it runs long.' },
            { title: 'Download the PDF', detail: 'Ready to share with people who do not have Excel.' },
        ],
        faqs: [
            { question: 'Is my spreadsheet uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Are formulas included?', answer: 'The calculated values are what you see in the PDF, which is what a reader needs. The formulas behind them are not carried over.' },
            { question: 'What happens to charts and formatting?', answer: 'The PDF contains the cell values as a clean table. Cell colours, conditional formatting and embedded charts are not reproduced.' },
            { question: 'Will wide sheets be cut off?', answer: 'Very wide rows are trimmed to fit the page width. For large data sets, export a narrower selection first.' },
        ],
        related: ['pdf-to-excel', 'word-to-pdf', 'html-to-pdf', 'compress-pdf'],
        keywords: ['xlsx to pdf', 'spreadsheet to pdf'],
    },

    'html-to-pdf': {
        metaTitle: 'HTML to PDF — Convert a Web Page File',
        metaDescription:
            'Convert an HTML file into a paginated A4 PDF with styles, tables and images intact. Runs locally in your browser, free and without watermarks.',
        intro:
            'Render an HTML file as a PDF. Headings, tables, lists and images are laid out onto A4 pages with sensible print styling.',
        steps: [
            { title: 'Add the HTML file', detail: 'Drop in a .html or .htm file. Plain text files also work.' },
            { title: 'Render the page', detail: 'The markup is rendered in an isolated frame with print-friendly styles.' },
            { title: 'Download the PDF', detail: 'Long documents are split across A4 pages automatically.' },
        ],
        faqs: [
            { question: 'Is my file uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Can I convert a live URL?', answer: 'Not currently — the tool converts an HTML file you provide. Save the page from your browser first, then convert the saved file.' },
            { question: 'Will external CSS and images be included?', answer: 'Images referenced by absolute URLs are fetched if they allow it. Styles from external stylesheets are replaced with clean print styling so the PDF stays readable.' },
            { question: 'Does JavaScript run?', answer: 'No. The file is rendered as static markup, so anything generated by scripts will not appear.' },
        ],
        related: ['word-to-pdf', 'excel-to-pdf', 'pdf-to-jpg', 'compress-pdf'],
        keywords: ['web page to pdf', 'html file to pdf'],
    },

    'pdf-to-jpg': {
        metaTitle: 'PDF to JPG — Convert PDF Pages to Images',
        metaDescription:
            'Turn every PDF page into a high-resolution JPG image. One page returns the image, several return a ZIP. Free and entirely offline in your browser.',
        intro:
            'Render PDF pages as images you can drop into a slide, a post or a chat. Pages are rendered at double resolution so text stays sharp.',
        steps: [
            { title: 'Add the PDF', detail: 'Drop in the document you want to convert.' },
            { title: 'Render the pages', detail: 'Each page is drawn at 2x scale for a crisp result.' },
            { title: 'Download the images', detail: 'A single page downloads as one image; multiple pages arrive together in a ZIP.' },
        ],
        faqs: [
            { question: 'Are my files uploaded?', answer: PRIVACY_ANSWER },
            { question: 'What resolution are the images?', answer: 'Pages are rendered at twice their natural size — roughly 144 DPI — which keeps body text legible without producing enormous files.' },
            { question: 'Can I get PNG instead of JPG?', answer: 'JPG is used because it keeps page images small. For a lossless copy of a page, use Extract Pages to keep it as a PDF.' },
            { question: 'Will the text still be selectable?', answer: 'No — an image has no text layer. Keep the PDF, or run OCR PDF, if you need the words.' },
        ],
        related: ['image-to-pdf', 'pdf-to-powerpoint', 'compress-image', 'ocr-pdf'],
        keywords: ['pdf to image', 'pdf to png', 'convert pdf pages to jpg'],
    },

    'pdf-to-word': {
        metaTitle: 'PDF to Word — Convert PDF to Editable DOCX',
        metaDescription:
            'Extract the text of a PDF into an editable Word document. Free, no sign-up, and the file is converted inside your browser.',
        intro:
            'Get the text of a PDF into a Word document you can edit. The content of each page is written into a .docx file that Word, Pages and Google Docs all open.',
        steps: [
            { title: 'Add the PDF', detail: 'Drop in the document you want to edit.' },
            { title: 'Extract the text', detail: 'Each page is read in order and written into paragraphs.' },
            { title: 'Download the .docx', detail: 'Open it in Word and edit freely.' },
        ],
        faqs: [
            { question: 'Is my file uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Will the layout be identical to the PDF?', answer: 'No, and this is worth knowing before you start: the conversion recovers text, not page design. Columns, exact positioning and images are not rebuilt.' },
            { question: 'It produced almost no text — why?', answer: 'The PDF is probably a scan, which contains pictures of words rather than words. Run OCR PDF first to recognise the text.' },
            { question: 'Can I convert back afterwards?', answer: 'Yes — edit the .docx and use Word to PDF to produce a new PDF.' },
        ],
        related: ['word-to-pdf', 'ocr-pdf', 'pdf-to-excel', 'pdf-to-jpg'],
        keywords: ['pdf to docx', 'pdf to editable word', 'convert pdf to word free'],
    },

    'pdf-to-powerpoint': {
        metaTitle: 'PDF to PowerPoint — Convert PDF to PPTX Slides',
        metaDescription:
            'Turn a PDF into a PowerPoint deck with one slide per page. Opens in PowerPoint, Keynote and Google Slides. Free and fully private.',
        intro:
            'Convert a PDF into a presentation. Each page is rendered and placed on its own 16:9 slide, centred and scaled to fit.',
        steps: [
            { title: 'Add the PDF', detail: 'Drop in the document you want to present.' },
            { title: 'Build the slides', detail: 'Every page is rendered as a slide image in a real .pptx package.' },
            { title: 'Open in PowerPoint', detail: 'The file works in PowerPoint, Keynote, Google Slides and LibreOffice.' },
        ],
        faqs: [
            { question: 'Is my file uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Will the slide text be editable?', answer: 'No. Each slide holds a picture of the page, because a PDF page has no slide structure — no title placeholder, no bullet list — to rebuild from.' },
            { question: 'What aspect ratio are the slides?', answer: 'Widescreen 16:9. Portrait pages are centred with even margins rather than stretched.' },
            { question: 'Can I edit the slides afterwards?', answer: 'You can add your own text boxes and shapes on top of each page image in PowerPoint.' },
        ],
        related: ['powerpoint-to-pdf', 'pdf-to-jpg', 'pdf-to-word', 'compress-pdf'],
        keywords: ['pdf to pptx', 'pdf to slides'],
    },

    'pdf-to-excel': {
        metaTitle: 'PDF to Excel — Extract PDF Data to a Spreadsheet',
        metaDescription:
            'Pull text and table-like rows out of a PDF into an .xlsx spreadsheet. Free, no upload, and it runs entirely in your browser.',
        intro:
            'Get the contents of a PDF into a spreadsheet you can sort and filter. Each line becomes a row, labelled with the page it came from.',
        steps: [
            { title: 'Add the PDF', detail: 'Works best on documents with a real text layer, such as statements and reports.' },
            { title: 'Extract the rows', detail: 'Text is read page by page and split into rows.' },
            { title: 'Open in Excel', detail: 'Download the .xlsx and clean up the columns as needed.' },
        ],
        faqs: [
            { question: 'Is my file uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Will complex tables come out perfectly?', answer: 'Rarely, and you should expect to tidy up. A PDF stores positioned text, not cells, so column boundaries have to be inferred from spacing.' },
            { question: 'My PDF is a scan and nothing came out.', answer: 'Scans contain images of text. Run OCR PDF first, then bring the recognised text here.' },
            { question: 'Which formats can I open the result in?', answer: 'It is a standard .xlsx, so Excel, Google Sheets, Numbers and LibreOffice all open it.' },
        ],
        related: ['excel-to-pdf', 'pdf-to-word', 'ocr-pdf', 'pdf-to-jpg'],
        keywords: ['pdf to xlsx', 'pdf table to excel', 'extract pdf data'],
    },

    'pdf-to-pdfa': {
        metaTitle: 'PDF to PDF/A — Flatten a PDF for Archiving',
        metaDescription:
            'Flatten a PDF into a self-contained archival document so it always renders the same way. Free, private and processed in your browser.',
        intro:
            'Prepare a document for long-term storage. Every page is flattened into an image, so missing fonts, form fields and hidden layers can never change how it renders later.',
        steps: [
            { title: 'Add the PDF', detail: 'Drop in the document you want to archive.' },
            { title: 'Flatten the pages', detail: 'Each page is rendered and rebuilt as a fixed, self-contained page.' },
            { title: 'Store the result', detail: 'The output opens identically in any reader, on any device, years from now.' },
        ],
        faqs: [
            { question: 'Is this certified PDF/A?', answer: 'No, and we would rather say so plainly. True PDF/A conformance requires an embedded colour profile and validation that a browser cannot perform. This produces a flattened, self-contained PDF with the same practical benefit: it always renders the same way.' },
            { question: 'Will the text still be selectable?', answer: 'No. Flattening turns pages into images, which is exactly what makes the appearance permanent. Keep the original if you need searchable text.' },
            { question: 'Why did the file get bigger?', answer: 'Page images carry more data than the text and vectors they replace. That is the cost of guaranteeing the appearance.' },
            { question: 'Does this remove form fields?', answer: 'Yes — fields, annotations and hidden layers are baked into the page image, which is usually the point when archiving.' },
        ],
        related: ['compress-pdf', 'repair-pdf', 'redact-pdf', 'pdf-to-jpg'],
        keywords: ['pdfa converter', 'archive pdf', 'flatten pdf'],
    },

    'rotate-pdf': {
        metaTitle: 'Rotate PDF — Turn Pages the Right Way Up',
        metaDescription:
            'Rotate every page of a PDF and save the change permanently. Free, no watermark, and the document never leaves your browser.',
        intro:
            'Fix a document that opens sideways. The rotation is written into the file, so it stays correct for everyone who opens it.',
        steps: [
            { title: 'Add the PDF', detail: 'Drop in the sideways or upside-down document.' },
            { title: 'Rotate the pages', detail: 'Every page turns a quarter turn clockwise. Run it twice for 180 degrees.' },
            { title: 'Download the fixed file', detail: 'The new orientation is saved into the document itself.' },
        ],
        faqs: [
            { question: 'Is my file uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Can I rotate only some pages?', answer: 'Yes — use Organize PDF, which rotates each page individually. That is the right tool for a scan where only a few sheets went in sideways.' },
            { question: 'Why does my viewer still show it sideways?', answer: 'Some viewers cache the old file. Close and reopen the downloaded copy rather than refreshing the preview.' },
            { question: 'Does rotating affect quality?', answer: 'No. Rotation changes a page attribute; the page content is untouched.' },
        ],
        related: ['organize-pdf', 'crop-pdf', 'merge-pdf', 'scan-pdf'],
        keywords: ['turn pdf pages', 'rotate pdf permanently'],
    },

    'add-page-numbers': {
        metaTitle: 'Add Page Numbers to a PDF Online Free',
        metaDescription:
            'Stamp page numbers onto a PDF, with a choice of position and format such as "1" or "Page 1 of 10". Free, private and without watermarks.',
        intro:
            'Number the pages of a document before printing or submitting it. Choose where the numbers sit and how they read.',
        steps: [
            { title: 'Add the PDF', detail: 'Drop in the document to number.' },
            { title: 'Choose position and format', detail: 'Pick a corner or the centre, and a format such as 1, 1 / 10, or Page 1 of 10.' },
            { title: 'Download the numbered PDF', detail: 'Numbers are drawn into each page as real text.' },
        ],
        faqs: [
            { question: 'Is my file uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Can I start numbering from a different number?', answer: 'The tool numbers from 1 across every page. To skip a cover sheet, split it off first, number the rest, then merge them back together.' },
            { question: 'Will the numbers cover my content?', answer: 'They sit in the page margin at the position you choose. On a page with no margin, pick the opposite corner.' },
            { question: 'Are the numbers selectable text?', answer: 'Yes — they are drawn as real text, so they stay crisp at any zoom and print cleanly.' },
        ],
        related: ['watermark-pdf', 'merge-pdf', 'organize-pdf', 'edit-pdf'],
        keywords: ['number pdf pages', 'pdf page numbering'],
    },

    'watermark-pdf': {
        metaTitle: 'Add a Watermark to a PDF Online Free',
        metaDescription:
            'Stamp text such as CONFIDENTIAL or DRAFT across every page of a PDF. Free, no sign-up, and the document stays on your device.',
        intro:
            'Mark a document before you share it. Your text is tiled diagonally across every page at a light opacity, so it is clearly visible without hiding the content.',
        steps: [
            { title: 'Add the PDF', detail: 'Drop in the document you want to mark.' },
            { title: 'Type the watermark text', detail: 'Something like CONFIDENTIAL, DRAFT or a company name.' },
            { title: 'Download the marked file', detail: 'The text is tiled across every page.' },
        ],
        faqs: [
            { question: 'Is my file uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Can the watermark be removed by someone else?', answer: 'A determined person with the right software can remove a drawn watermark. Treat it as a clear label of intent, not as protection — use Redact PDF to remove sensitive content properly.' },
            { question: 'Can I use an image or logo?', answer: 'The page tool takes text. Image watermarks are supported by the underlying library and are on the roadmap for the interface.' },
            { question: 'Will it make the text unreadable?', answer: 'No. The watermark is drawn at low opacity so the document underneath stays legible.' },
        ],
        related: ['add-page-numbers', 'protect-pdf', 'redact-pdf', 'sign-pdf'],
        keywords: ['pdf watermark', 'stamp pdf confidential'],
    },

    'crop-pdf': {
        metaTitle: 'Crop PDF — Trim Page Margins Online Free',
        metaDescription:
            'Trim white margins or scan edges from a PDF with a live preview. Sets both CropBox and MediaBox so print matches the screen. Free and private.',
        intro:
            'Trim unwanted margins from a document — scanner borders, oversized white space, or a header you do not want to print. A preview shows the new page edges as you type.',
        steps: [
            { title: 'Add the PDF', detail: 'The first page is rendered as a live preview.' },
            { title: 'Set the margins', detail: 'Enter how much to trim from each edge, as a percentage or in millimetres.' },
            { title: 'Download the cropped PDF', detail: 'Every page is trimmed the same way.' },
        ],
        faqs: [
            { question: 'Is my file uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Does cropping delete the content outside the margin?', answer: 'It changes the visible page boundary rather than erasing content. If the trimmed area must be truly gone, crop first and then run PDF to PDF/A to flatten the pages.' },
            { question: 'Why do both CropBox and MediaBox change?', answer: 'Viewers honour CropBox, but many printers and converters only read MediaBox. Setting one alone gives you a file that looks cropped on screen and uncropped on paper.' },
            { question: 'Can I crop a single page differently?', answer: 'Not yet — the margins apply to every page. Split the page out, crop it, then merge it back.' },
        ],
        related: ['rotate-pdf', 'organize-pdf', 'scan-pdf', 'compress-pdf'],
        keywords: ['trim pdf margins', 'pdf cropper'],
    },

    'edit-pdf': {
        metaTitle: 'Edit PDF — Add Text to a PDF Online Free',
        metaDescription:
            'Add text boxes anywhere on a PDF page, with a choice of size and colour. Click to place, then download. Free, no watermark, nothing uploaded.',
        intro:
            'Add text to a finished PDF — fill in a blank, annotate a drawing, or correct a detail — without going back to the original document.',
        steps: [
            { title: 'Add the PDF', detail: 'Every page is rendered so you can see where you are typing.' },
            { title: 'Type, then click to place', detail: 'Enter your text, choose a size and colour, and click the spot on the page where it belongs.' },
            { title: 'Download the edited PDF', detail: 'Your text is drawn into the page as real, selectable text.' },
        ],
        faqs: [
            { question: 'Is my file uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Can I edit the text that is already in the PDF?', answer: 'No — this adds new text on top. Changing existing text means rebuilding the page, which usually breaks the layout; convert to Word instead if you need to rewrite the content.' },
            { question: 'Can I remove something instead?', answer: 'Use Redact PDF, which covers an area and rebuilds the page so the hidden content is genuinely gone.' },
            { question: 'Is the added text selectable?', answer: 'Yes. It is drawn as real text, so it can be searched, selected and printed at full quality.' },
        ],
        related: ['sign-pdf', 'redact-pdf', 'add-page-numbers', 'pdf-to-word'],
        keywords: ['add text to pdf', 'pdf annotation', 'fill pdf form'],
    },

    'unlock-pdf': {
        metaTitle: 'Unlock PDF — Remove a PDF Password',
        metaDescription:
            'Remove the password from a PDF you own so it opens without prompting. Enter the password, get an unlocked copy back.',
        intro:
            'Remove the password from a document you can already open, so you do not have to type it every time or pass it on to colleagues.',
        steps: [
            { title: 'Add the protected PDF', detail: 'Drop in the locked document.' },
            { title: 'Enter its password', detail: 'You need the password that currently opens the file.' },
            { title: 'Download the unlocked copy', detail: 'The new file opens without a prompt.' },
        ],
        faqs: [
            { question: 'Can this crack a password I do not know?', answer: 'No. You must supply the correct password. The tool removes encryption you can already get past — it does not break into documents.' },
            { question: 'Is this tool private like the others?', answer: 'This one is the exception: PDF encryption cannot be performed in the browser, so the file and password are sent over an encrypted connection to our server, processed, and returned. Every other tool on this site is fully offline.' },
            { question: 'Is it legal to remove a password?', answer: 'For your own documents, or ones you have permission to modify, yes. Do not use it on files you are not authorised to change.' },
            { question: 'The tool says the server is unreachable.', answer: 'Encryption runs on our API, so unlike the offline tools it needs a connection. Try again shortly.' },
        ],
        related: ['protect-pdf', 'redact-pdf', 'watermark-pdf', 'sign-pdf'],
        keywords: ['remove pdf password', 'decrypt pdf'],
    },

    'protect-pdf': {
        metaTitle: 'Protect PDF — Add a Password to a PDF',
        metaDescription:
            'Encrypt a PDF with a password so only people who know it can open the file. Simple, fast and free.',
        intro:
            'Add a password to a document before sending it, so it can only be opened by someone who knows the password.',
        steps: [
            { title: 'Add the PDF', detail: 'Drop in the document to protect.' },
            { title: 'Choose a password', detail: 'Use something long and unique, and share it through a different channel than the file itself.' },
            { title: 'Download the protected PDF', detail: 'Opening it now requires the password.' },
        ],
        faqs: [
            { question: 'Is this tool private like the others?', answer: 'This one is the exception: PDF encryption cannot be performed in the browser, so the file and password travel over an encrypted connection to our server and are returned immediately. Every other tool on this site is fully offline.' },
            { question: 'What happens if I forget the password?', answer: 'The document cannot be recovered — that is what encryption means. Store the password in a password manager before you send the file.' },
            { question: 'Can I restrict printing or copying instead?', answer: 'Currently the tool sets an open password. Permission-only restrictions are not enforced by many readers anyway, so a password is the stronger choice.' },
            { question: 'How strong is the protection?', answer: 'It is only as strong as your password. A short or reused password is guessable regardless of the encryption.' },
        ],
        related: ['unlock-pdf', 'redact-pdf', 'watermark-pdf', 'sign-pdf'],
        keywords: ['password protect pdf', 'encrypt pdf'],
    },

    'sign-pdf': {
        metaTitle: 'Sign PDF — Add Your Signature Online Free',
        metaDescription:
            'Draw or type a signature, place it anywhere on a PDF page and download the signed document. Free, no account, and nothing is uploaded.',
        intro:
            'Sign a document without printing it. Draw your signature with a finger, trackpad or stylus — or type your name — then click the page to place it.',
        steps: [
            { title: 'Add the PDF', detail: 'Pages are rendered so you can pick the right spot.' },
            { title: 'Draw or type your signature', detail: 'Draw in the box, or switch to typing and pick a size.' },
            { title: 'Place it and download', detail: 'Click the page where the signature belongs, optionally add the date, and download.' },
        ],
        faqs: [
            { question: 'Is my document uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Is this a legally binding digital signature?', answer: 'It is a visible signature — an image of your signature drawn onto the page — not a cryptographic one. It suits everyday agreements and forms. For a certified signature that proves who signed and detects tampering, use a dedicated e-signature service.' },
            { question: 'Can I sign more than one page?', answer: 'Run the tool again on the signed file to add a signature to another page.' },
            { question: 'Can I reuse my signature later?', answer: 'The drawing is not stored between visits, which is a consequence of nothing being uploaded. Keep a PNG of your signature if you sign often.' },
        ],
        related: ['edit-pdf', 'protect-pdf', 'watermark-pdf', 'redact-pdf'],
        keywords: ['e-sign pdf', 'signature on pdf', 'sign document online'],
    },

    'redact-pdf': {
        metaTitle: 'Redact PDF — Permanently Remove Sensitive Text',
        metaDescription:
            'Black out names, numbers and addresses so they are genuinely gone, not just covered. Pages are rebuilt as images. Free and fully offline.',
        intro:
            'Remove sensitive information properly. Drag over the areas to hide and the page is rebuilt so the covered text cannot be selected, copied or recovered.',
        steps: [
            { title: 'Add the PDF', detail: 'Pages are rendered so you can see what needs covering.' },
            { title: 'Drag over the sensitive areas', detail: 'Mark as many areas as you need, across as many pages as you need.' },
            { title: 'Download the redacted file', detail: 'Marked areas are painted out and the page is rebuilt from the image.' },
        ],
        faqs: [
            { question: 'Is my document uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Is the text really gone, or just hidden?', answer: 'Really gone. Drawing a black rectangle in most editors leaves the text underneath, where anyone can select and copy it — a mistake that has leaked real documents. This tool re-renders each page as an image with the areas painted out, so there is nothing underneath to recover.' },
            { question: 'What is the trade-off?', answer: 'The redacted pages become images, so the document is no longer searchable and the file is usually larger. That is the price of the content actually being removed.' },
            { question: 'Can I redact one page and keep the rest searchable?', answer: 'Not in a single pass — the whole document is rebuilt. Split the page out, redact it, then merge it back if that matters.' },
        ],
        related: ['protect-pdf', 'watermark-pdf', 'pdf-to-pdfa', 'edit-pdf'],
        keywords: ['black out pdf text', 'pdf redaction tool', 'hide information pdf'],
    },

    'compare-pdf': {
        metaTitle: 'Compare PDF — Find Differences Between Two PDFs',
        metaDescription:
            'Compare two PDFs word by word and get a highlighted report of everything added and removed, page by page. Free and entirely offline.',
        intro:
            'See exactly what changed between two versions of a document. The text is compared word by word, so you get the words that moved rather than whole paragraphs flagged as different.',
        steps: [
            { title: 'Add both PDFs', detail: 'The first file is treated as the original, the second as the new version.' },
            { title: 'Run the comparison', detail: 'Each page is compared and a summary tells you how many pages differ.' },
            { title: 'Open the report', detail: 'Download a self-contained HTML report — additions in green, removals struck through in red.' },
        ],
        faqs: [
            { question: 'Are my files uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Does it compare images and layout?', answer: 'No — this is a text comparison. Moved images, colour changes and font differences are not reported.' },
            { question: 'One of my PDFs is a scan and nothing was found.', answer: 'Scans contain images of text, so there is nothing to compare. Run OCR PDF on both files first.' },
            { question: 'What if the documents have different page counts?', answer: 'Extra pages are reported as present in only one of the two files, so you can see what was added or dropped.' },
        ],
        related: ['ocr-pdf', 'merge-pdf', 'extract-pages', 'pdf-to-word'],
        keywords: ['pdf diff', 'compare two pdfs', 'document comparison'],
    },

    'resize-image': {
        metaTitle: 'Resize Image Online — Change Dimensions Free',
        metaDescription:
            'Resize a JPG, PNG or WebP by pixels or percentage, with stretch, fit and crop modes. Free, no watermark, and the image never leaves your browser.',
        intro:
            'Change an image to exact dimensions for an upload limit, a profile picture or a print size. Choose whether to stretch, fit inside the frame or fill and crop.',
        steps: [
            { title: 'Add the image', detail: 'JPG, PNG and WebP are supported, and the original size is detected automatically.' },
            { title: 'Set the new size', detail: 'Enter pixels or a percentage, and pick a fit mode and output format.' },
            { title: 'Download the result', detail: 'Resizing happens on a canvas in your browser.' },
        ],
        faqs: [
            { question: 'Is my image uploaded?', answer: PRIVACY_ANSWER },
            { question: 'What is the difference between fit, crop and stretch?', answer: 'Fit puts the whole image inside the frame and may leave background around it. Crop fills the frame and trims the overflow. Stretch forces the exact dimensions and can distort the picture.' },
            { question: 'Will enlarging an image make it sharper?', answer: 'No. Enlarging invents pixels that were never captured, so the result looks softer. Always start from the largest original you have.' },
            { question: 'Which format should I choose?', answer: 'JPG for photographs, PNG when you need transparency or crisp text, WebP for the smallest files on the web.' },
        ],
        related: ['compress-image', 'image-to-pdf', 'pdf-to-jpg', 'scan-pdf'],
        keywords: ['image resizer', 'change image dimensions', 'resize photo online'],
    },

    'compress-image': {
        metaTitle: 'Compress Image — Reduce Photo File Size Free',
        metaDescription:
            'Shrink JPG and PNG images to a target size or percentage while keeping them sharp. Free, unlimited, and processed inside your browser.',
        intro:
            'Make an image small enough for an upload limit or a faster page, without an obvious drop in quality. Aim at a percentage of the original or a specific file size.',
        steps: [
            { title: 'Add the image', detail: 'The current file size is shown so you know what you are working from.' },
            { title: 'Choose a target', detail: 'Either a percentage of the original or a size in KB or MB.' },
            { title: 'Download the smaller image', detail: 'Compare it with the original before using it.' },
        ],
        faqs: [
            { question: 'Is my image uploaded?', answer: PRIVACY_ANSWER },
            { question: 'Will the image visibly lose quality?', answer: 'Moderate compression is usually invisible on photographs. Pushing to a very small target introduces soft patches and blocky edges, which show up most on text and flat colour.' },
            { question: 'Why did my PNG barely shrink?', answer: 'PNG is lossless, so there is less to discard. Screenshots and graphics with few colours compress well; photographs saved as PNG should be converted to JPG first with Resize Image.' },
            { question: 'Is there a file size limit?', answer: 'Only what your device can hold in memory. Very large images on an older phone may run out of memory.' },
        ],
        related: ['resize-image', 'image-to-pdf', 'compress-pdf', 'pdf-to-jpg'],
        keywords: ['image compressor', 'reduce photo size', 'compress jpg'],
    },
};

/** Content for tools that do not have a bespoke entry yet. */
export function getToolContent(id: string, title: string, description: string): ToolContent {
    return (
        toolContent[id] ?? {
            metaTitle: `${title} — Free Online Tool`,
            metaDescription: description,
            intro: description,
            steps: [
                { title: 'Add your file', detail: 'Drag and drop your file into the box above, or click to choose one.' },
                { title: 'Choose your options', detail: 'Adjust the settings for this tool if it offers any.' },
                { title: 'Download the result', detail: 'Your file is processed in the browser and downloads straight away.' },
            ],
            faqs: [{ question: 'Are my files uploaded to a server?', answer: PRIVACY_ANSWER }],
            related: ['merge-pdf', 'compress-pdf', 'split-pdf', 'pdf-to-jpg'].filter((r) => r !== id).slice(0, 4),
        }
    );
}
