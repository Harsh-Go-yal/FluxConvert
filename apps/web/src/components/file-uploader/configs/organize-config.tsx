import React from 'react';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, RotateCw, Trash2, Undo2 } from "lucide-react";

/** One page in the working order, carrying its own rotation and removal state. */
export interface OrganizePage {
    /** Zero-based index in the original document. */
    index: number;
    rotation: number;
    removed: boolean;
}

interface OrganizeConfigProps {
    pages: OrganizePage[];
    setPages: (pages: OrganizePage[]) => void;
    thumbnails: string[];
    generatingThumbnails: boolean;
}

export function OrganizeConfig({ pages, setPages, thumbnails, generatingThumbnails }: OrganizeConfigProps) {
    const move = (position: number, direction: -1 | 1) => {
        const target = position + direction;
        if (target < 0 || target >= pages.length) return;
        const next = [...pages];
        [next[position], next[target]] = [next[target], next[position]];
        setPages(next);
    };

    const update = (position: number, patch: Partial<OrganizePage>) =>
        setPages(pages.map((page, i) => (i === position ? { ...page, ...patch } : page)));

    const remaining = pages.filter((p) => !p.removed).length;

    if (generatingThumbnails) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Rendering pages…
            </div>
        );
    }
    if (pages.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label>Arrange pages</Label>
                <span className="text-xs text-muted-foreground">
                    {remaining} of {pages.length} page{pages.length === 1 ? '' : 's'} kept
                </span>
            </div>
            <p className="text-xs text-muted-foreground">
                Reorder with the arrows, rotate or remove individual pages. The result follows this order.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {pages.map((page, position) => (
                    <div
                        key={`${page.index}-${position}`}
                        className={`rounded-xl border p-2 space-y-2 transition-opacity ${
                            page.removed ? 'opacity-40 border-destructive/40' : 'border-border/60'
                        }`}
                    >
                        <div className="relative overflow-hidden rounded-lg bg-muted/40">
                            {thumbnails[page.index] ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={thumbnails[page.index]}
                                    alt={`Page ${page.index + 1}`}
                                    className="w-full h-auto transition-transform"
                                    style={{ transform: `rotate(${page.rotation}deg)` }}
                                />
                            ) : (
                                <div className="aspect-[3/4] grid place-items-center text-xs text-muted-foreground">
                                    Page {page.index + 1}
                                </div>
                            )}
                            <span className="absolute bottom-1 right-1 rounded bg-background/85 px-1.5 text-xs font-medium">
                                {page.index + 1}
                            </span>
                        </div>

                        <div className="flex items-center justify-between gap-1">
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => move(position, -1)} disabled={position === 0} aria-label="Move earlier">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => update(position, { rotation: (page.rotation + 90) % 360 })} aria-label="Rotate">
                                <RotateCw className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => update(position, { removed: !page.removed })}
                                aria-label={page.removed ? 'Restore page' : 'Remove page'}>
                                {page.removed ? <Undo2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => move(position, 1)} disabled={position === pages.length - 1} aria-label="Move later">
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
