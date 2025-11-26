import { File as FileIcon, X } from "lucide-react";

interface FileListProps {
    files: File[];
    removeFile: (index: number) => void;
}

export function FileList({ files, removeFile }: FileListProps) {
    return (
        <div className="flex flex-col items-center w-full z-10">
            <div className="flex flex-wrap gap-3 justify-center mb-6 w-full">
                {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-background/80 backdrop-blur-sm border border-border px-4 py-2 rounded-full text-sm shadow-sm animate-in fade-in zoom-in duration-300">
                        <FileIcon className="w-4 h-4 text-primary" />
                        <span className="truncate max-w-[200px] font-medium">{f.name}</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                            className="hover:text-destructive hover:bg-destructive/10 rounded-full p-1 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
            <p className="text-sm text-muted-foreground bg-background/50 px-4 py-1 rounded-full">
                Click to add more files or drag & drop
            </p>
        </div>
    );
}
