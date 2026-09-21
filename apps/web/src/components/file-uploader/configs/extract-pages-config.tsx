import React from 'react';
import { PageRangeSelector } from "@/components/ui/page-range-selector";

interface ExtractPagesConfigProps {
    pages: string;
    setPages: (val: string) => void;
    totalPages: number;
}

export function ExtractPagesConfig({ pages, setPages, totalPages }: ExtractPagesConfigProps) {
    return (
        <div className="w-full animate-in fade-in slide-in-from-left-2">
            <PageRangeSelector
                totalPages={totalPages}
                value={pages}
                onChange={setPages}
                label="Pages to extract"
                hint="Only the selected pages will be kept"
            />
        </div>
    );
}
