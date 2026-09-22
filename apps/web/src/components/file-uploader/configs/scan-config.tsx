"use client";

import React from 'react';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Trash2 } from "lucide-react";

export interface ScanPage {
    id: string;
    blob: Blob;
    url: string;
}

interface ScanConfigProps {
    pages: ScanPage[];
    setPages: (pages: ScanPage[]) => void;
    enhance: boolean;
    setEnhance: (value: boolean) => void;
}

/**
 * Capture document photos with the device camera. The rear camera is requested
 * at high resolution; everything stays in the browser.
 */
export function ScanConfig({ pages, setPages, enhance, setEnhance }: ScanConfigProps) {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const streamRef = React.useRef<MediaStream | null>(null);
    const [active, setActive] = React.useState(false);
    const [error, setError] = React.useState('');

    const stop = React.useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setActive(false);
    }, []);

    React.useEffect(() => stop, [stop]);

    const start = async () => {
        setError('');
        if (!navigator.mediaDevices?.getUserMedia) {
            setError('This browser cannot access a camera. You can still upload photos instead.');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setActive(true);
        } catch (err: unknown) {
            const name = err instanceof Error ? err.name : '';
            setError(
                name === 'NotAllowedError'
                    ? 'Camera permission was denied. Allow it in your browser, or upload photos instead.'
                    : 'No camera is available. You can upload photos instead.',
            );
        }
    };

    const capture = async () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')!.drawImage(video, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', 0.92),
        );
        if (!blob) return;
        setPages([...pages, { id: Math.random().toString(36).slice(2), blob, url: URL.createObjectURL(blob) }]);
    };

    const remove = (id: string) => {
        const page = pages.find((p) => p.id === id);
        if (page) URL.revokeObjectURL(page.url);
        setPages(pages.filter((p) => p.id !== id));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label>Capture pages</Label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                        type="checkbox"
                        checked={enhance}
                        onChange={(e) => setEnhance(e.target.checked)}
                        className="accent-primary"
                    />
                    Clean up (grayscale + contrast)
                </label>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-border/60 bg-black/90 aspect-video">
                <video ref={videoRef} playsInline muted className="h-full w-full object-contain" />
                {!active && (
                    <div className="absolute inset-0 grid place-items-center gap-3 text-center p-6">
                        <Camera className="h-8 w-8 text-white/50" />
                        <p className="text-xs text-white/70 max-w-xs">
                            {error || 'Use your camera to photograph each page, or upload photos above.'}
                        </p>
                        <Button type="button" size="sm" onClick={start}>
                            Start camera
                        </Button>
                    </div>
                )}
            </div>

            {active && (
                <div className="flex gap-2">
                    <Button type="button" onClick={capture} className="flex-1">
                        <Camera className="h-4 w-4 mr-2" /> Capture page {pages.length + 1}
                    </Button>
                    <Button type="button" variant="outline" onClick={stop}>
                        <CameraOff className="h-4 w-4 mr-2" /> Stop
                    </Button>
                </div>
            )}

            {pages.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                        {pages.length} captured page{pages.length === 1 ? '' : 's'}
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {pages.map((page, index) => (
                            <div key={page.id} className="relative rounded-lg overflow-hidden border border-border/60">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={page.url} alt={`Captured page ${index + 1}`} className="w-full h-auto" />
                                <button
                                    type="button"
                                    aria-label={`Remove page ${index + 1}`}
                                    onClick={() => remove(page.id)}
                                    className="absolute top-1 right-1 rounded bg-background/90 p-1"
                                >
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </button>
                                <span className="absolute bottom-1 left-1 rounded bg-background/85 px-1.5 text-xs">
                                    {index + 1}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
