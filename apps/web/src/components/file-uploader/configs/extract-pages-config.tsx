import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface ExtractPagesConfigProps {
    pagesToExtract: string;
    setPagesToExtract: (val: string) => void;
    thumbnails: string[];
    generatingThumbnails: boolean;
}

/** Page picker for "Extract pages": type a range, or click thumbnails to toggle pages. */
export function ExtractPagesConfig({
    pagesToExtract,
    setPagesToExtract,
    thumbnails,
    generatingThumbnails,
}: ExtractPagesConfigProps) {
    const selected = new Set<number>();
    for (const part of pagesToExtract.split(',')) {
        const chunk = part.trim();
        if (!chunk) continue;
        if (chunk.includes('-')) {
            const [start, end] = chunk.split('-').map((n) => parseInt(n, 10));
            if (!isNaN(start) && !isNaN(end)) for (let i = start; i <= end; i++) selected.add(i);
        } else {
            const page = parseInt(chunk, 10);
            if (!isNaN(page)) selected.add(page);
        }
    }

    const togglePage = (index: number) => {
        const pageNumber = index + 1;
        if (selected.has(pageNumber)) selected.delete(pageNumber);
        else selected.add(pageNumber);
        setPagesToExtract(Array.from(selected).sort((a, b) => a - b).join(', '));
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="pages-to-extract">Pages to extract</Label>
                <Input
                    id="pages-to-extract"
                    value={pagesToExtract}
                    onChange={(e) => setPagesToExtract(e.target.value)}
                    placeholder="e.g. 1-3, 5, 8"
                />
                <p className="text-xs text-muted-foreground">
                    Leave empty to keep every page. Ranges are inclusive and 1-based.
                </p>
            </div>

            {generatingThumbnails && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Rendering pages…
                </div>
            )}

            {thumbnails.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {thumbnails.map((src, index) => {
                        const isSelected = selected.has(index + 1);
                        return (
                            <button
                                type="button"
                                key={index}
                                onClick={() => togglePage(index)}
                                aria-pressed={isSelected}
                                className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                                    isSelected
                                        ? 'border-primary ring-2 ring-primary/30'
                                        : 'border-border/50 opacity-60 hover:opacity-100'
                                }`}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={src} alt={`Page ${index + 1}`} className="w-full h-auto" />
                                <span className="absolute bottom-1 right-1 rounded bg-background/80 px-1.5 text-xs font-medium">
                                    {index + 1}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
