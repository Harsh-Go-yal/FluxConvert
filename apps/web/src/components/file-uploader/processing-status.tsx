import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Download, Monitor, UploadCloud } from "lucide-react";
import { ProcessingMode } from "@/lib/file-utils";

interface ProcessingStatusProps {
    isProcessing: boolean;
    statusMessage: string;
    errorMessage?: string;
    downloadUrl: string | null;
    downloadFilename: string;
    handleProcess: () => void;
    mode: ProcessingMode | null;
    action: string;
}

export function ProcessingStatus({
    isProcessing, statusMessage, errorMessage, downloadUrl, downloadFilename, handleProcess, mode, action
}: ProcessingStatusProps) {
    return (
        <div className="flex flex-col gap-4 mt-8">
            {/* Processing errors used to be swallowed into statusMessage, which only
                renders while processing — so failures looked like nothing happened. */}
            {errorMessage && !isProcessing && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-left animate-in fade-in slide-in-from-top-2"
                >
                    <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                    <div className="min-w-0">
                        <p className="font-medium text-destructive">Couldn&apos;t finish that</p>
                        <p className="text-sm text-muted-foreground break-words">{errorMessage}</p>
                    </div>
                </div>
            )}

            {/* Hide Process button if download is ready */}
            {!downloadUrl && (
                <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] h-12 text-lg font-medium rounded-xl"
                    size="lg"
                    variant={mode === ProcessingMode.LOCAL ? "default" : "secondary"}
                    onClick={handleProcess}
                    disabled={isProcessing || !action}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {statusMessage || "Processing..."}
                        </>
                    ) : (
                        <>
                            {mode === ProcessingMode.LOCAL ? "Process Locally" : "Upload & Process"}
                            <Download className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            )}

            {downloadUrl && (
                <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 transition-all hover:scale-[1.01] animate-in fade-in slide-in-from-top-2 h-12 text-lg font-medium rounded-xl"
                    size="lg"
                    onClick={() => {
                        const link = document.createElement('a');
                        link.href = downloadUrl;
                        link.download = downloadFilename || 'processed_file';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }}
                >
                    <Download className="mr-2 h-5 w-5" />
                    Download {downloadFilename}
                </Button>
            )}
        </div>
    );
}
