import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PdfService } from '@/services/pdf-service';
import { ProcessingMode } from '@/lib/pdf/pdf.types';
import { Loader2 } from "lucide-react";

export function PdfMergeForm() {
    const [files, setFiles] = useState<File[]>([]);
    const [mode, setMode] = useState<ProcessingMode>('auto');
    const [isProcessing, setIsProcessing] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
            setDownloadUrl(null);
            setError(null);
        }
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            setError("Please select at least 2 PDF files.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const { blob, filename } = await PdfService.handlePdfMerge(files, mode);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
        } catch (err: any) {
            setError(err.message || "Merge failed");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 py-4">
            <div className="space-y-2">
                <Label htmlFor="files">Select PDF Files</Label>
                <Input id="files" type="file" accept=".pdf" multiple onChange={handleFileChange} />
                <p className="text-sm text-muted-foreground">Selected: {files.length} files</p>
            </div>

            <div className="space-y-2">
                <Label>Processing Mode</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as ProcessingMode)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="auto" id="auto" />
                        <Label htmlFor="auto">Auto (Hybrid)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="local" id="local" />
                        <Label htmlFor="local">Local (WASM)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cloud" id="cloud" />
                        <Label htmlFor="cloud">Cloud (API)</Label>
                    </div>
                </RadioGroup>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="flex gap-4">
                <Button onClick={handleMerge} disabled={isProcessing || files.length < 2}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Merge PDFs
                </Button>

                {downloadUrl && (
                    <Button variant="outline" asChild>
                        <a href={downloadUrl} download="merged.pdf">Download Result</a>
                    </Button>
                )}
            </div>
        </div>
    );
}
