import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface WatermarkConfigProps {
    watermarkText: string;
    setWatermarkText: (val: string) => void;
}

export function WatermarkConfig({ watermarkText, setWatermarkText }: WatermarkConfigProps) {
    return (
        <div className="max-w-xs animate-in fade-in slide-in-from-left-2">
            <Label>Watermark Text</Label>
            <Input
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="CONFIDENTIAL"
                className="mt-1.5"
            />
        </div>
    );
}
