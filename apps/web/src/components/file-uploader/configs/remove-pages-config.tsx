import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";

interface RemovePagesConfigProps {
    pagesToRemove: string;
    setPagesToRemove: (val: string) => void;
    thumbnails: string[];
    generatingThumbnails: boolean;
}

export function RemovePagesConfig({
    pagesToRemove,
    setPagesToRemove,
    thumbnails,
    generatingThumbnails
}: RemovePagesConfigProps) {

    // Helper to toggle page removal
    const togglePageRemoval = (pageIndex: number) => {
        const currentPages = new Set<number>();
        const parts = pagesToRemove.split(',').map(p => p.trim());
        parts.forEach(part => {
            if (part.includes('-')) {
                const [s, e] = part.split('-').map(Number);
                if (!isNaN(s) && !isNaN(e)) {
                    for (let i = s; i <= e; i++) currentPages.add(i);
                }
            } else {
                const p = parseInt(part);
                if (!isNaN(p)) currentPages.add(p);
            }
        });

        const pageNum = pageIndex + 1;
        if (currentPages.has(pageNum)) {
            currentPages.delete(pageNum);
        } else {
            currentPages.add(pageNum);
        }

        const sorted = Array.from(currentPages).sort((a, b) => a - b);
        setPagesToRemove(sorted.join(', '));
    };

    // Helper to check if page is removed
    const isPageRemoved = (pageIndex: number) => {
        const pageNum = pageIndex + 1;
        const parts = pagesToRemove.split(',').map(p => p.trim());
        for (const part of parts) {
            if (part.includes('-')) {
                const [s, e] = part.split('-').map(Number);
                if (!isNaN(s) && !isNaN(e) && pageNum >= s && pageNum <= e) return true;
            } else {
                if (parseInt(part) === pageNum) return true;
            }
        }
        return false;
    };

    return (
        <div className="w-full animate-in fade-in slide-in-from-left-2 space-y-4">
            <div className="max-w-xs">
                <Label>Pages to Remove (e.g. 1,3-5)</Label>
                <Input
                    value={pagesToRemove}
                    onChange={(e) => setPagesToRemove(e.target.value)}
                    placeholder="1, 3-5"
                    className="mt-1.5"
                />
            </div>

            {generatingThumbnails ? (
                <div className="flex items-center justify-center p-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Generating previews...
                </div>
            ) : thumbnails.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4 max-h-[400px] overflow-y-auto p-2 border rounded-xl bg-muted/20">
                    {thumbnails.map((thumb, index) => {
                        const removed = isPageRemoved(index);
                        return (
                            <div
                                key={index}
                                onClick={() => togglePageRemoval(index)}
                                className={`
                                    relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200
                                    ${removed
                                        ? 'border-destructive opacity-60 scale-95 grayscale'
                                        : 'border-transparent hover:border-primary hover:shadow-md'
                                    }
                                `}
                            >
                                <img src={thumb} alt={`Page ${index + 1}`} className="w-full h-auto object-cover" />
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                                    Page {index + 1}
                                </div>

                                {/* Overlay for removed state */}
                                {removed && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-destructive/20 backdrop-blur-[1px]">
                                        <X className="w-12 h-12 text-destructive drop-shadow-lg" />
                                    </div>
                                )}

                                {/* Hover overlay for active state */}
                                {!removed && (
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <div className="bg-destructive text-destructive-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                            Click to Remove
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
