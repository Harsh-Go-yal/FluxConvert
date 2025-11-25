"use client";

import dynamic from "next/dynamic";

const FileUploader = dynamic(() => import("./file-uploader"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-64 flex items-center justify-center border-2 border-dashed rounded-xl border-border bg-muted/50">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm">Loading uploader...</p>
            </div>
        </div>
    ),
});

export default function ClientFileUploader({ initialAction }: { initialAction?: string }) {
    return <FileUploader initialAction={initialAction} />;
}
