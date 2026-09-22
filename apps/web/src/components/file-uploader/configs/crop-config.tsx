import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { CropMargins } from "@/lib/pdf/crop";

interface CropConfigProps {
    margins: CropMargins;
    setMargins: (margins: CropMargins) => void;
    unit: 'percent' | 'mm';
    setUnit: (unit: 'percent' | 'mm') => void;
    thumbnails: string[];
    generatingThumbnails: boolean;
}

const EDGES: (keyof CropMargins)[] = ['top', 'right', 'bottom', 'left'];

export function CropConfig({
    margins,
    setMargins,
    unit,
    setUnit,
    thumbnails,
    generatingThumbnails,
}: CropConfigProps) {
    // The preview overlay is only meaningful in percent; mm depends on page size.
    const percent = (value: number) => (unit === 'percent' ? Math.min(Math.max(value, 0), 45) : 0);

    return (
        <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label>Margins to remove</Label>
                    <div className="flex rounded-lg border border-border/60 p-0.5">
                        {(['percent', 'mm'] as const).map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setUnit(option)}
                                aria-pressed={unit === option}
                                className={`rounded-md px-3 py-1 text-xs transition-colors ${
                                    unit === option ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                                }`}
                            >
                                {option === 'percent' ? '%' : 'mm'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {EDGES.map((edge) => (
                        <div key={edge} className="space-y-1.5">
                            <Label htmlFor={`crop-${edge}`} className="text-xs capitalize text-muted-foreground">
                                {edge}
                            </Label>
                            <Input
                                id={`crop-${edge}`}
                                type="number"
                                min={0}
                                max={unit === 'percent' ? 45 : 100}
                                value={margins[edge]}
                                onChange={(e) =>
                                    setMargins({ ...margins, [edge]: Math.max(0, Number(e.target.value) || 0) })
                                }
                            />
                        </div>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">
                    Applied to every page. Percentages are relative to each page&apos;s own size, and are capped at
                    45% per edge so a page can never collapse.
                </p>
            </div>

            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Preview</Label>
                <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                    {generatingThumbnails && (
                        <div className="aspect-[3/4] grid place-items-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {!generatingThumbnails && thumbnails[0] && (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={thumbnails[0]} alt="First page" className="w-full h-auto" />
                            <div
                                className="absolute border-2 border-primary bg-primary/5 pointer-events-none transition-all"
                                style={{
                                    top: `${percent(margins.top)}%`,
                                    right: `${percent(margins.right)}%`,
                                    bottom: `${percent(margins.bottom)}%`,
                                    left: `${percent(margins.left)}%`,
                                }}
                            />
                        </>
                    )}
                    {!generatingThumbnails && !thumbnails[0] && (
                        <div className="aspect-[3/4] grid place-items-center text-xs text-muted-foreground">
                            Add a PDF to see a preview
                        </div>
                    )}
                </div>
                {unit === 'mm' && (
                    <p className="text-xs text-muted-foreground">
                        The preview outline only tracks percentage margins.
                    </p>
                )}
            </div>
        </div>
    );
}
