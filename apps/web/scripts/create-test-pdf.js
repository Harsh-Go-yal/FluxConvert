const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function createPdf() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText('This is a test PDF for protection verification.');
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('test-protection.pdf', pdfBytes);
    console.log('test-protection.pdf created');
}

createPdf();
