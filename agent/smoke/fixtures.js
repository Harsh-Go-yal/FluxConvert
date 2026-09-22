'use strict';
/** Small sample input files for the smoke test, generated on the fly. */
const fs = require('fs');
const path = require('path');
const cfg = require('../orchestrator/config');

function webRequire(name) {
  for (const base of [path.join(cfg.WEB_DIR, 'node_modules'), path.join(cfg.ROOT, 'node_modules')]) {
    try {
      return require(path.join(base, name));
    } catch {}
  }
  return require(name);
}

// A real PNG encoder: hand-pasted base64 images tend to have subtly wrong CRCs,
// which browsers reject with "The source image could not be decoded" — a fixture
// bug that looks exactly like an application bug.
const zlib = require('zlib');

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Opaque RGBA PNG with a simple gradient, so filters and resizing have something to act on. */
function makePng(width = 64, height = 64) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      raw[offset++] = Math.round((x / (width - 1)) * 255);
      raw[offset++] = Math.round((y / (height - 1)) * 255);
      raw[offset++] = 128;
      raw[offset++] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const JPG_B64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAQABABAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

function pdf(pages, label) {
  const { PDFDocument, StandardFonts, rgb } = webRequire('pdf-lib');
  return (async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 1; i <= pages; i++) {
      const p = doc.addPage([595, 842]);
      p.drawText(`${label} — page ${i} of ${pages}`, { x: 60, y: 760, size: 24, font, color: rgb(0.1, 0.1, 0.4) });
      p.drawText('The quick brown fox jumps over the lazy dog. 0123456789', { x: 60, y: 700, size: 12, font });
      p.drawRectangle({ x: 60, y: 400, width: 200, height: 120, color: rgb(0.9, 0.3, 0.3) });
    }
    return Buffer.from(await doc.save());
  })();
}

function xlsx() {
  const XLSX = webRequire('xlsx');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Item', 'Qty', 'Price'],
    ['Widget', 2, 9.99],
    ['Gadget', 1, 24.5],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

async function docx() {
  const JSZip = webRequire('jszip');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello from FluxConvert smoke test.</w:t></w:r></w:p><w:p><w:r><w:t>Second paragraph.</w:t></w:r></w:p></w:body></w:document>`);
  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }));
}

/** Creates all fixtures in `dir` and returns their paths. */
async function create(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const w = (name, buf) => {
    const p = path.join(dir, name);
    fs.writeFileSync(p, buf);
    return p;
  };
  return {
    pdf: w('sample.pdf', await pdf(3, 'Sample A')),
    pdf2: w('sample-2.pdf', await pdf(2, 'Sample B')),
    png: w('sample.png', makePng()),
    jpg: w('sample.jpg', Buffer.from(JPG_B64, 'base64')),
    xlsx: w('sample.xlsx', xlsx()),
    docx: w('sample.docx', await docx()),
    html: w('sample.html', Buffer.from('<html><body><h1>FluxConvert</h1><p>Smoke test document.</p></body></html>')),
  };
}

module.exports = { create };
