"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAadhaarPDF } from "@/lib/indian-docs";
import { Upload } from "lucide-react";

export default function IndianToolsPage() {
    const [frontFile, setFrontFile] = useState<File | null>(null);
    const [backFile, setBackFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);

    const handleCreatePDF = async () => {
        if (!frontFile || !backFile) return;
        setProcessing(true);
        try {
            const pdfBytes = await createAadhaarPDF(frontFile, backFile);
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
        } catch (error) {
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="container mx-auto p-8">
            <h1 className="text-3xl font-bold mb-8">Indian Document Tools</h1>

            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Aadhaar to PDF</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files && setFrontFile(e.target.files[0])}
                                    className="hidden"
                                    id="front-upload"
                                />
                                <label htmlFor="front-upload" className="cursor-pointer flex flex-col items-center">
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-sm text-gray-600">Front Side</span>
                                </label>
                                {frontFile && <p className="text-xs mt-2">{frontFile.name}</p>}
                            </div>

                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files && setBackFile(e.target.files[0])}
                                    className="hidden"
                                    id="back-upload"
                                />
                                <label htmlFor="back-upload" className="cursor-pointer flex flex-col items-center">
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-sm text-gray-600">Back Side</span>
                                </label>
                                {backFile && <p className="text-xs mt-2">{backFile.name}</p>}
                            </div>
                        </div>

                        <Button onClick={handleCreatePDF} disabled={!frontFile || !backFile || processing}>
                            {processing ? "Generating PDF..." : "Generate Aadhaar PDF"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
