"use client";

import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eraser, Loader2 } from "lucide-react";

export interface SignatureState {
    /** PNG data URL of the drawn signature, or empty when typing. */
    dataUrl: string;
    typedName: string;
    mode: 'draw' | 'type';
    page: number;
    /** Placement as fractions of the page, from the top-left. */
    x: number;
    y: number;
    width: number;
    includeDate: boolean;
}

interface SignConfigProps {
    signature: SignatureState;
    setSignature: (value: SignatureState) => void;
    thumbnails: string[];
    generatingThumbnails: boolean;
}

export function SignConfig({ signature, setSignature, thumbnails, generatingThumbnails }: SignConfigProps) {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const drawing = React.useRef(false);
    const hasInk = React.useRef(false);

    const patch = (changes: Partial<SignatureState>) => setSignature({ ...signature, ...changes });

    const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * canvas.width,
            y: ((event.clientY - rect.top) / rect.height) * canvas.height,
        };
    };

    const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.setPointerCapture(event.pointerId);
        const context = canvas.getContext('2d')!;
        const { x, y } = pointFrom(event);
        context.beginPath();
        context.moveTo(x, y);
        drawing.current = true;
    };

    const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawing.current) return;
        const context = canvasRef.current!.getContext('2d')!;
        const { x, y } = pointFrom(event);
        context.lineTo(x, y);
        context.lineWidth = 2.5;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = '#111827';
        context.stroke();
        hasInk.current = true;
    };

    const end = () => {
        if (!drawing.current) return;
        drawing.current = false;
        const canvas = canvasRef.current;
        if (canvas && hasInk.current) patch({ dataUrl: canvas.toDataURL('image/png') });
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
        hasInk.current = false;
        patch({ dataUrl: '' });
    };

    const place = (event: React.MouseEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        patch({
            x: Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 0.95),
            y: Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 0.95),
        });
    };

    return (
        <div className="space-y-5">
            <p className="text-xs text-muted-foreground">
                This adds a visible signature image to the page. It is not a cryptographic digital signature and
                does not certify the document.
            </p>

            <div className="flex rounded-lg border border-border/60 p-0.5 w-fit">
                {(['draw', 'type'] as const).map((mode) => (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => patch({ mode })}
                        aria-pressed={signature.mode === mode}
                        className={`rounded-md px-4 py-1.5 text-sm capitalize transition-colors ${
                            signature.mode === mode ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                        }`}
                    >
                        {mode}
                    </button>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    {signature.mode === 'draw' ? (
                        <>
                            <Label>Draw your signature</Label>
                            <canvas
                                ref={canvasRef}
                                width={600}
                                height={200}
                                onPointerDown={start}
                                onPointerMove={draw}
                                onPointerUp={end}
                                onPointerLeave={end}
                                className="w-full h-40 rounded-xl border-2 border-dashed border-border/70 bg-background touch-none cursor-crosshair"
                            />
                            <Button type="button" variant="ghost" size="sm" onClick={clear}>
                                <Eraser className="h-4 w-4 mr-2" /> Clear
                            </Button>
                        </>
                    ) : (
                        <>
                            <Label htmlFor="signature-name">Your name</Label>
                            <Input
                                id="signature-name"
                                value={signature.typedName}
                                onChange={(e) => patch({ typedName: e.target.value })}
                                placeholder="e.g. Harsh Goyal"
                            />
                            <div className="rounded-xl border border-border/60 bg-background p-6 text-center">
                                <span className="text-3xl italic text-primary">
                                    {signature.typedName || 'Your name'}
                                </span>
                            </div>
                        </>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="signature-width" className="text-xs text-muted-foreground">
                            Size ({Math.round(signature.width * 100)}% of page width)
                        </Label>
                        <input
                            id="signature-width"
                            type="range"
                            min={10}
                            max={60}
                            value={Math.round(signature.width * 100)}
                            onChange={(e) => patch({ width: Number(e.target.value) / 100 })}
                            className="w-full accent-primary"
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                            type="checkbox"
                            checked={signature.includeDate}
                            onChange={(e) => patch({ includeDate: e.target.checked })}
                            className="accent-primary"
                        />
                        Add today&apos;s date under the signature
                    </label>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                        Click the page to place it (page {signature.page + 1})
                    </Label>
                    {generatingThumbnails ? (
                        <div className="aspect-[3/4] grid place-items-center rounded-xl border border-border/60">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : thumbnails.length > 0 ? (
                        <>
                            <div
                                onClick={place}
                                className="relative overflow-hidden rounded-xl border border-border/60 cursor-crosshair"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={thumbnails[signature.page]} alt={`Page ${signature.page + 1}`} className="w-full h-auto" />
                                <div
                                    className="absolute border-2 border-primary bg-primary/10 grid place-items-center text-[10px] text-primary pointer-events-none"
                                    style={{
                                        left: `${signature.x * 100}%`,
                                        top: `${signature.y * 100}%`,
                                        width: `${signature.width * 100}%`,
                                        height: '8%',
                                    }}
                                >
                                    signature
                                </div>
                            </div>
                            {thumbnails.length > 1 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {thumbnails.map((_, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => patch({ page: index })}
                                            aria-pressed={signature.page === index}
                                            className={`h-7 w-7 rounded text-xs transition-colors ${
                                                signature.page === index
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                            }`}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="aspect-[3/4] grid place-items-center rounded-xl border border-border/60 text-xs text-muted-foreground">
                            Add a PDF to choose where to sign
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
