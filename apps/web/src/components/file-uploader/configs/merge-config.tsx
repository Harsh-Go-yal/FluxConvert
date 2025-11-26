import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface MergeConfigProps {
    files: File[];
    setFiles: (files: File[]) => void;
}

export function MergeConfig({ files, setFiles }: MergeConfigProps) {
    // TODO: Implement drag and drop reordering
    return (
        <div className="space-y-2">
            <Label>File Order (Drag to reorder - coming soon)</Label>
            <div className="text-sm text-muted-foreground">
                Files will be merged in the order shown above.
            </div>
        </div>
    );
}
