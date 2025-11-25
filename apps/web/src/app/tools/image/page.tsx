"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { compressImage, resizeImage } from "@/lib/image-tools";
import { Upload } from "lucide-react";

export default function ImageToolsPage() {
    const [file, setFile] = useState<File | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setProcessedImage(null);
        }
    };

    const handleCompress = async () => {
        if (!file) return;
        setProcessing(true);
        try {
            const blob = await compressImage(file, 0.7); // 70% quality
            const url = URL.createObjectURL(blob);
            setProcessedImage(url);
        } catch (error) {
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="container mx-auto p-8">
            <h1 className="text-3xl font-bold mb-8">Image Tools</h1>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Compress Image</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="image-upload"
                                />
                                <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-sm text-gray-600">Select Image</span>
                                </label>
                            </div>
                            {file && (
                                <div className="text-sm text-gray-600">
                                    Selected: {file.name}
                                </div>
                            )}
                            <Button onClick={handleCompress} disabled={!file || processing}>
                                {processing ? "Compressing..." : "Compress Image"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {processedImage && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Result</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <img src={processedImage} alt="Processed" className="max-w-full h-auto rounded" />
                            <Button className="mt-4 w-full" onClick={() => window.open(processedImage, "_blank")}>
                                Download
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
