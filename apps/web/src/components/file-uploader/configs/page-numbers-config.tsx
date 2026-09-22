import React from 'react';
import { Label } from "@/components/ui/label";
import type { PageNumberFormat, PageNumberPosition } from "@/lib/pdf/page-numbers";

interface PageNumbersConfigProps {
    position: PageNumberPosition;
    setPosition: (val: PageNumberPosition) => void;
    format: PageNumberFormat;
    setFormat: (val: PageNumberFormat) => void;
}

const POSITIONS: { value: PageNumberPosition; label: string }[] = [
    { value: 'bottom-center', label: 'Bottom centre' },
    { value: 'bottom-right', label: 'Bottom right' },
    { value: 'bottom-left', label: 'Bottom left' },
    { value: 'top-center', label: 'Top centre' },
    { value: 'top-right', label: 'Top right' },
    { value: 'top-left', label: 'Top left' },
];

const FORMATS: { value: PageNumberFormat; label: string }[] = [
    { value: 'n', label: '1' },
    { value: 'n-of-total', label: '1 / 10' },
    { value: 'page-n', label: 'Page 1' },
    { value: 'page-n-of-total', label: 'Page 1 of 10' },
];

export function PageNumbersConfig({ position, setPosition, format, setFormat }: PageNumbersConfigProps) {
    return (
        <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label>Position</Label>
                <div className="grid grid-cols-3 gap-2">
                    {POSITIONS.map((option) => (
                        <button
                            type="button"
                            key={option.value}
                            onClick={() => setPosition(option.value)}
                            aria-pressed={position === option.value}
                            className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                                position === option.value
                                    ? 'border-primary bg-primary/10 text-foreground'
                                    : 'border-border/50 text-muted-foreground hover:border-primary/40'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label>Format</Label>
                <div className="grid grid-cols-2 gap-2">
                    {FORMATS.map((option) => (
                        <button
                            type="button"
                            key={option.value}
                            onClick={() => setFormat(option.value)}
                            aria-pressed={format === option.value}
                            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                                format === option.value
                                    ? 'border-primary bg-primary/10 text-foreground'
                                    : 'border-border/50 text-muted-foreground hover:border-primary/40'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
