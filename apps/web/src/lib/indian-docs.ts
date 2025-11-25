import { PDFDocument } from 'pdf-lib';

export async function createAadhaarPDF(frontImage: File, backImage: File): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size

    const frontBytes = await frontImage.arrayBuffer();
    const backBytes = await backImage.arrayBuffer();

    let frontImg, backImg;
    if (frontImage.type === 'image/png') {
        frontImg = await pdfDoc.embedPng(frontBytes);
    } else {
        frontImg = await pdfDoc.embedJpg(frontBytes);
    }

    if (backImage.type === 'image/png') {
        backImg = await pdfDoc.embedPng(backBytes);
    } else {
        backImg = await pdfDoc.embedJpg(backBytes);
    }

    // Layout logic for Aadhaar (Top half front, bottom half back, or side by side)
    // This is a simplified layout
    const { width, height } = page.getSize();
    const imgWidth = width - 100;
    const imgHeight = (imgWidth / frontImg.width) * frontImg.height;

    page.drawImage(frontImg, {
        x: 50,
        y: height - imgHeight - 50,
        width: imgWidth,
        height: imgHeight,
    });

    page.drawImage(backImg, {
        x: 50,
        y: height - imgHeight * 2 - 70,
        width: imgWidth,
        height: imgHeight,
    });

    return await pdfDoc.save();
}
