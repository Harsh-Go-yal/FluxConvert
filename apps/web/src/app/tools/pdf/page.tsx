"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mergePDFs, splitPDF, extractPageRange } from "@/lib/pdf-tools";
import { Upload } from "lucide-react";

export default function PDFToolsPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [processing, setProcessing] = useState(false);

    // Split PDF State
    const [splitFile, setSplitFile] = useState<File | null>(null);
    const [startPage, setStartPage] = useState<number>(1);
    const [endPage, setEndPage] = useState<number>(1);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleMerge = async () => {
        if (files.length < 2) return;
        setProcessing(true);
        try {
            const mergedPdfBytes = await mergePDFs(files);
            const blob = new Blob([mergedPdfBytes as any], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
        } catch (error) {
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    const handleSplit = async () => {
        if (!splitFile || !startPage || !endPage) return;
        setProcessing(true);
        try {
            const splitPdfBytes = await extractPageRange(splitFile, startPage, endPage);
            const blob = new Blob([splitPdfBytes as any], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);

            // Create a link to download the file
            const link = document.createElement('a');
            link.href = url;
            link.download = `split-${startPage}-${endPage}-${splitFile.name}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error(error);
            alert("Error splitting PDF. Please check page range.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="container mx-auto p-8">
            <h1 className="text-3xl font-bold mb-8">PDF Tools</h1>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Merge PDFs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="pdf-upload"
                                />
                                <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-sm text-gray-600">Select PDF files</span>
                                </label>
                            </div>
                            {files.length > 0 && (
                                <div className="text-sm text-gray-600">
                                    Selected {files.length} files
                                </div>
                            )}
                            <Button onClick={handleMerge} disabled={files.length < 2 || processing}>
                                {processing ? "Merging..." : "Merge PDFs"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Split PDF / Extract Range</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            setSplitFile(e.target.files[0]);
                                        }
                                    }}
                                    className="hidden"
                                    id="split-pdf-upload"
                                />
                                <label htmlFor="split-pdf-upload" className="cursor-pointer flex flex-col items-center">
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-sm text-gray-600">
                                        {splitFile ? splitFile.name : "Select PDF file"}
                                    </span>
                                </label>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-sm font-medium mb-1 block">Start Page</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={startPage}
                                        onChange={(e) => setStartPage(parseInt(e.target.value))}
                                        className="w-full border rounded-md p-2"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm font-medium mb-1 block">End Page</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={endPage}
                                        onChange={(e) => setEndPage(parseInt(e.target.value))}
                                        className="w-full border rounded-md p-2"
                                    />
                                </div>
                            </div>

                            <Button onClick={handleSplit} disabled={!splitFile || !startPage || !endPage || processing}>
                                {processing ? "Splitting..." : "Split PDF"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
