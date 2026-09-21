"use client";

import * as React from 'react';
import { GripVertical, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PageThumbnail } from '@/lib/pdf/thumbnails';

interface OrganizeConfigProps {
    thumbnails: PageThumbnail[];
    generatingThumbnails: boolean;
    order: number[];
    setOrder: (order: number[]) => void;
}

export function OrganizeConfig({
    thumbnails,
    generatingThumbnails,
    order,
    setOrder,
}: OrganizeConfigProps) {
    const [dragIndex, setDragIndex] = React.useState<number | null>(null);
    const [overIndex, setOverIndex] = React.useState<number | null>(null);

    const thumbByIndex = React.useMemo(() => {
        const map = new Map<number, PageThumbnail>();
        thumbnails.forEach((thumb) => map.set(thumb.index, thumb));
        return map;
    }, [thumbnails]);

    const move = React.useCallback(
        (from: number, to: number) => {
            if (from === to) return;
            setOrder((() => {
                const next = [...order];
                const [moved] = next.splice(from, 1);
                next.splice(to, 0, moved);
                return next;
            })());
        },
        [order, setOrder],
    );

    const handleDragStart = (position: number) => (e: React.DragEvent) => {
        setDragIndex(position);
        e.dataTransfer.effectAllowed = 'move';
        // Required for Firefox to initiate a drag.
        e.dataTransfer.setData('text/plain', String(position));
    };

    const handleDragOver = (position: number) => (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (overIndex !== position) setOverIndex(position);
    };

    const handleDrop = (position: number) => (e: React.DragEvent) => {
        e.preventDefault();
        if (dragIndex !== null) move(dragIndex, position);
        setDragIndex(null);
        setOverIndex(null);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        setOverIndex(null);
    };

    const resetOrder = () => {
        setOrder(thumbnails.map((thumb) => thumb.index));
    };

    if (generatingThumbnails) {
        return (
            <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02]">
                <div className="flex flex-col items-center gap-3 text-white/60">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-300" />
                    <p className="text-sm">Rendering page previews…</p>
                </div>
            </div>
        );
    }

    if (!thumbnails.length) {
        return (
            <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-white/50">
                No pages to display.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">
                    Drag pages to reorder them. The first page in the grid becomes page 1.
                </p>
                <button
                    type="button"
                    onClick={resetOrder}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {order.map((pageIndex, position) => {
                    const thumb = thumbByIndex.get(pageIndex);
                    if (!thumb) return null;
                    const isDragging = dragIndex === position;
                    const isOver = overIndex === position && dragIndex !== position;
                    return (
                        <div
                            key={pageIndex}
                            draggable
                            onDragStart={handleDragStart(position)}
                            onDragOver={handleDragOver(position)}
                            onDrop={handleDrop(position)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                                'group relative cursor-grab overflow-hidden rounded-xl border bg-white/[0.03] p-2 transition-colors active:cursor-grabbing',
                                isDragging
                                    ? 'border-indigo-400/70 opacity-60'
                                    : isOver
                                        ? 'border-indigo-400/70 shadow-[0_0_0_1px_rgba(129,140,248,0.6)]'
                                        : 'border-white/10 hover:border-white/25',
                            )}
                        >
                            <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-white/5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={thumb.dataUrl}
                                    alt={`Page ${thumb.pageNumber}`}
                                    className="h-full w-full object-contain"
                                    draggable={false}
                                />
                                <span className="absolute left-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/60 px-1.5 text-[11px] font-semibold tabular-nums text-white">
                                    {position + 1}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between px-0.5">
                                <span className="text-[11px] font-medium tabular-nums text-white/60">
                                    Original {thumb.pageNumber}
                                </span>
                                <GripVertical className="h-3.5 w-3.5 text-white/40" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default OrganizeConfig;
