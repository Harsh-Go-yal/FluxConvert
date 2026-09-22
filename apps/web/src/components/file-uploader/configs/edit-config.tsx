"use client";

import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Type } from "lucide-react";

export interface TextAnnotation {
    page: number;
    /** Top-left position as fractions of the page. */
    x: number;
    y: number;
    text: string;
    size: number;
    color: { r: number; g: number; b: number };
}

interface EditConfigProps {
    annotations: TextAnnotation[];
    setAnnotations: (value: TextAnnotation[]) => void;
    thumbnails: string[];
    generatingThumbnails: boolean;
}

const COLORS: { label: string; value: { r: number; g: number; b: number } }[] = [
    { label: 'Black', value: { r: 0, g: 0, b: 0 } },
    { label: 'Red', value: { r: 0.8, g: 0.1, b: 0.1 } },
    { label: 'Blue', value: { r: 0.1, g: 0.25, b: 0.75 } },
];

export function EditConfig({ annotations, setAnnotations, thumbnails, generatingThumbnails }: EditConfigProps) {
    const [activePage, setActivePage] = React.useState(0);
    const [draft, setDraft] = React.useState('');
    const [size, setSize] = React.useState(14);
    const [color, setColor] = React.useState(COLORS[0].value);

    const addAt = (event: React.MouseEvent<HTMLDivElement>) => {
        const text = draft.trim();
        if (!text) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setAnnotations([
            ...annotations,
            {
                page: activePage,
                x: Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 0.95),
                y: Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 0.97),
                text,
                size,
                color,
            },
        ]);
        setDraft('');
    };

    const pageNotes = annotations.filter((a) => a.page === activePage);

    return (
        <div className="space-y-4">
            <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                <div className="space-y-1.5">
                    <Label htmlFor="edit-text">Text to add</Label>
                    <Input
                        id="edit-text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Type here, then click the page to place it"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="edit-size" className="text-xs text-muted-foreground">Size</Label>
                    <Input
                        id="edit-size"
                        type="number"
                        min={6}
                        max={72}
                        value={size}
                        onChange={(e) => setSize(Math.min(72, Math.max(6, Number(e.target.value) || 14)))}
                        className="w-20"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Colour</Label>
                    <div className="flex gap-1.5">
                        {COLORS.map((option) => (
                            <button
                                key={option.label}
                                type="button"
                                aria-label={option.label}
                                aria-pressed={color === option.value}
                                onClick={() => setColor(option.value)}
                                className={`h-9 w-9 rounded-lg border-2 transition-all ${
                                    color === option.value ? 'border-primary scale-105' : 'border-border/60'
                                }`}
                                style={{
                                    backgroundColor: `rgb(${option.value.r * 255}, ${option.value.g * 255}, ${option.value.b * 255})`,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {generatingThumbnails ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Rendering pages…
                </div>
            ) : thumbnails.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add a PDF to start editing.</p>
            ) : (
                <div className="grid md:grid-cols-[1fr_auto] gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                            {draft.trim()
                                ? `Click page ${activePage + 1} to place "${draft.trim().slice(0, 24)}"`
                                : 'Type something above, then click the page'}
                        </Label>
                        <div
                            onClick={addAt}
                            className={`relative overflow-hidden rounded-xl border border-border/60 ${
                                draft.trim() ? 'cursor-crosshair' : 'cursor-default'
                            }`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={thumbnails[activePage]} alt={`Page ${activePage + 1}`} className="w-full h-auto" />
                            {pageNotes.map((note, index) => (
                                <span
                                    key={index}
                                    className="absolute whitespace-pre max-w-[90%] truncate"
                                    style={{
                                        left: `${note.x * 100}%`,
                                        top: `${note.y * 100}%`,
                                        fontSize: `${Math.max(8, note.size * 0.55)}px`,
                                        color: `rgb(${note.color.r * 255}, ${note.color.g * 255}, ${note.color.b * 255})`,
                                    }}
                                >
                                    {note.text}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 md:w-48">
                        <div className="flex flex-wrap gap-1.5">
                            {thumbnails.map((_, index) => {
                                const count = annotations.filter((a) => a.page === index).length;
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
                                            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground grid place-items-center">
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {annotations.length > 0 ? (
                            <div className="space-y-1.5 max-h-48 overflow-auto">
                                {annotations.map((note, index) => (
                                    <div key={index} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5">
                                        <Type className="h-3 w-3 shrink-0 text-muted-foreground" />
                                        <span className="text-xs truncate flex-1">
                                            p{note.page + 1}: {note.text}
                                        </span>
                                        <button
                                            type="button"
                                            aria-label="Remove"
                                            onClick={() => setAnnotations(annotations.filter((_, i) => i !== index))}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Plus className="h-3 w-3" /> No text added yet
                            </p>
                        )}

                        {annotations.length > 0 && (
                            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setAnnotations([])}>
                                Clear all
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
