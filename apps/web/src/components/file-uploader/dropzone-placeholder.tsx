import { CloudUpload } from "lucide-react";

interface DropzonePlaceholderProps {
    isDragActive: boolean;
}

export function DropzonePlaceholder({ isDragActive }: DropzonePlaceholderProps) {
    return (
        <>
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className={`
                w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 
                flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500
                shadow-inner ring-1 ring-white/10
            `}>
                <CloudUpload className={`w-12 h-12 text-primary transition-all duration-300 ${isDragActive ? 'scale-125 animate-bounce' : ''}`} />
            </div>

            <div className="relative z-10 space-y-2">
                <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    {isDragActive ? "Drop files here!" : "Drag & drop files here"}
                </p>
                <p className="text-muted-foreground text-lg">
                    or <span className="text-primary font-medium hover:underline">click to select</span>
                </p>
                <p className="text-xs text-muted-foreground/60 mt-4 font-medium uppercase tracking-wider">
                    PDF, Images, Excel, Word
                </p>
            </div>
        </>
    );
}
