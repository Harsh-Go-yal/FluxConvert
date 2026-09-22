import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PdfService } from '@/services/pdf-service';
import { ProcessingMode } from '@/lib/pdf/pdf.types';
import { Loader2 } from "lucide-react";

export function PdfSplitForm() {
    const [file, setFile] = useState<File | null>(null);
    const [ranges, setRanges] = useState("");
    const [mode, setMode] = useState<ProcessingMode>('auto');
    const [isProcessing, setIsProcessing] = useState(false);
    const [downloadUrls, setDownloadUrls] = useState<{ url: string; name: string }[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setDownloadUrls([]);
            setError(null);
        }
    };

    const handleSplit = async () => {
        if (!file || !ranges) {
            setError("Please select a file and specify ranges.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const { blobs, filenames } = await PdfService.handlePdfSplit(file, ranges);
            const urls = blobs.map((blob, i) => ({
                url: URL.createObjectURL(blob),
                name: filenames[i]
            }));
            setDownloadUrls(urls);
        } catch (err: any) {
            setError(err.message || "Split failed");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 py-4">
            <div className="space-y-2">
                <Label htmlFor="split-file">Select PDF File</Label>
                <Input id="split-file" type="file" accept=".pdf" onChange={handleFileChange} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="ranges">Page Ranges (e.g., "1-3, 5, 7-9")</Label>
                <Input
                    id="ranges"
                    placeholder="1-3, 5, 7-9"
                    value={ranges}
                    onChange={(e) => setRanges(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <Label>Processing Mode</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as ProcessingMode)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="auto" id="split-auto" />
                        <Label htmlFor="split-auto">Auto (Hybrid)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="local" id="split-local" />
                        <Label htmlFor="split-local">Local (WASM)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cloud" id="split-cloud" />
                        <Label htmlFor="split-cloud">Cloud (API)</Label>
                    </div>
                </RadioGroup>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="flex flex-col gap-4">
                <Button onClick={handleSplit} disabled={isProcessing || !file || !ranges}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Split PDF
                </Button>

                {downloadUrls.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <Label>Results:</Label>
                        {downloadUrls.map((item, idx) => (
                            <Button key={idx} variant="outline" asChild className="justify-start">
                                <a href={item.url} download={item.name}>Download {item.name}</a>
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
