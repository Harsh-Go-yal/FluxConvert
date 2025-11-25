"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";

export default function PDFTest() {
    const [pdfInfo, setPdfInfo] = useState<string>("");

    const createPdf = async () => {
        try {
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage();
            page.drawText("Hello from WASM!");
            const pdfBytes = await pdfDoc.save();
            setPdfInfo(`Created PDF with ${pdfBytes.byteLength} bytes`);
        } catch (error) {
            console.error(error);
            setPdfInfo("Error creating PDF");
        }
    };

    return (
        <div className="p-4 border rounded">
            <h2 className="text-xl font-bold mb-4">PDF-Lib WASM Test</h2>
            <button
                onClick={createPdf}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                Create Test PDF
            </button>
            {pdfInfo && <p className="mt-4">{pdfInfo}</p>}
        </div>
    );
}
