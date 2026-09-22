"use client";

import React from 'react';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Trash2 } from "lucide-react";
import type { PageBox } from "@/lib/pdf/rasterize";

interface RedactConfigProps {
    boxes: PageBox[];
    setBoxes: (boxes: PageBox[]) => void;
    thumbnails: string[];
    generatingThumbnails: boolean;
}

/** Drag across a page to mark an area for redaction. */
export function RedactConfig({ boxes, setBoxes, thumbnails, generatingThumbnails }: RedactConfigProps) {
    const [activePage, setActivePage] = React.useState(0);
    const [drag, setDrag] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const origin = React.useRef<{ x: number; y: number } | null>(null);

    const relative = (event: React.PointerEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return {
            x: Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1),
            y: Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1),
        };
    };

    const onDown = (event: React.PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        origin.current = relative(event);
        setDrag({ ...origin.current, w: 0, h: 0 });
    };

    const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!origin.current) return;
        const point = relative(event);
        setDrag({
            x: Math.min(origin.current.x, point.x),
            y: Math.min(origin.current.y, point.y),
            w: Math.abs(point.x - origin.current.x),
            h: Math.abs(point.y - origin.current.y),
        });
    };

    const onUp = () => {
        if (drag && drag.w > 0.01 && drag.h > 0.01) {
            setBoxes([...boxes, { page: activePage, x: drag.x, y: drag.y, width: drag.w, height: drag.h }]);
        }
        origin.current = null;
        setDrag(null);
    };

    const pageBoxes = boxes.filter((b) => b.page === activePage);

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
                <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                    Redaction rebuilds each page as an image with the marked areas painted out, so the hidden text
                    is genuinely removed — not just covered. The result has no selectable text.
                </p>
            </div>

            {generatingThumbnails ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Rendering pages…
                </div>
            ) : thumbnails.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add a PDF to mark areas for redaction.</p>
            ) : (
                <div className="grid md:grid-cols-[1fr_auto] gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                            Drag across page {activePage + 1} to mark an area
                        </Label>
                        <div
                            onPointerDown={onDown}
                            onPointerMove={onMove}
                            onPointerUp={onUp}
                            className="relative overflow-hidden rounded-xl border border-border/60 cursor-crosshair touch-none select-none"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={thumbnails[activePage]} alt={`Page ${activePage + 1}`} className="w-full h-auto pointer-events-none" draggable={false} />
                            {pageBoxes.map((box, index) => (
                                <div
                                    key={index}
                                    className="absolute bg-black/85 border border-black"
                                    style={{
                                        left: `${box.x * 100}%`,
                                        top: `${box.y * 100}%`,
                                        width: `${box.width * 100}%`,
                                        height: `${box.height * 100}%`,
                                    }}
                                />
                            ))}
                            {drag && (
                                <div
                                    className="absolute border-2 border-primary bg-primary/20 pointer-events-none"
                                    style={{
                                        left: `${drag.x * 100}%`,
                                        top: `${drag.y * 100}%`,
                                        width: `${drag.w * 100}%`,
                                        height: `${drag.h * 100}%`,
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 md:w-44">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">
                                {boxes.length} area{boxes.length === 1 ? '' : 's'}
                            </Label>
                            {boxes.length > 0 && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => setBoxes([])}>
                                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
                                </Button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {thumbnails.map((_, index) => {
                                const count = boxes.filter((b) => b.page === index).length;
                                return (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => setActivePage(index)}
                                        aria-pressed={activePage === index}
                                        className={`relative h-8 w-8 rounded text-xs transition-colors ${
                                            activePage === index
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                        }`}
                                    >
                                        {index + 1}
                                        {count > 0 && (
                                            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-white grid place-items-center">
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {pageBoxes.length > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => setBoxes(boxes.filter((b) => b.page !== activePage))}
                            >
                                Clear this page
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
