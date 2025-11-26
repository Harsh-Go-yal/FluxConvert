import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SplitConfigProps {
    startPage: number;
    setStartPage: (val: number) => void;
    endPage: number;
    setEndPage: (val: number) => void;
}

export function SplitConfig({ startPage, setStartPage, endPage, setEndPage }: SplitConfigProps) {
    return (
        <div className="flex gap-4 animate-in fade-in slide-in-from-left-2">
            <div className="flex-1">
                <Label>Start Page</Label>
                <Input
                    type="number"
                    min="1"
                    value={startPage}
                    onChange={(e) => setStartPage(parseInt(e.target.value) || 1)}
                    className="mt-1.5"
                />
            </div>
            <div className="flex-1">
                <Label>End Page</Label>
                <Input
                    type="number"
                    min="1"
                    value={endPage}
                    onChange={(e) => setEndPage(parseInt(e.target.value) || 1)}
                    className="mt-1.5"
                />
            </div>
        </div>
    );
}
