import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    File as FileIcon, FileSpreadsheet, FileText, Image as ImageIcon, Layers, Scissors,
    Lock, Unlock, Stamp, FileImage, RefreshCw, Maximize, Minimize
} from "lucide-react";

interface ToolSelectorProps {
    files: File[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
    action: string;
    setAction: (action: string) => void;
    getTabFromAction: (action: string) => string;
}

export function ToolSelector({ files, activeTab, setActiveTab, action, setAction, getTabFromAction }: ToolSelectorProps) {
    const renderFeatureCard = (id: string, icon: React.ReactNode, title: string, desc: string) => (
        <div
            onClick={() => {
                setAction(id);
                setActiveTab(getTabFromAction(id));
            }}
            className={`
                flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                ${action === id
                    ? "border-primary bg-primary/5 text-primary shadow-md scale-[1.02]"
                    : "border-border/50 hover:border-primary/50 hover:bg-muted/50 hover:scale-[1.01]"
                }
            `}
        >
            <div className={`p-3 rounded-full mb-3 ${action === id ? "bg-primary/10" : "bg-muted"}`}>
                {icon}
            </div>
            <h4 className="font-medium text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground text-center mt-1">{desc}</p>
        </div>
    );

    const fileName = files[0]?.name.toLowerCase();

    if (!fileName) return null;

    if (fileName.endsWith('.pdf')) {
        return (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-8">
                    <TabsTrigger value="organize">Organize</TabsTrigger>
                    <TabsTrigger value="convert">Convert</TabsTrigger>
                    <TabsTrigger value="edit">Edit</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="organize" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {renderFeatureCard("merge-pdf", <Layers className="w-6 h-6" />, "Merge", "Combine PDFs")}
                        {renderFeatureCard("split-pdf", <Scissors className="w-6 h-6" />, "Split", "Extract pages")}
                        {renderFeatureCard("remove-pages", <FileIcon className="w-6 h-6" />, "Remove", "Delete pages")}
                        {renderFeatureCard("rotate-pdf", <RefreshCw className="w-6 h-6" />, "Rotate", "Rotate pages")}
                    </div>
                </TabsContent>

                <TabsContent value="convert" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {renderFeatureCard("pdf-to-image", <FileImage className="w-6 h-6" />, "To Image", "Convert to JPG")}
                        {renderFeatureCard("pdf-to-word", <FileText className="w-6 h-6" />, "To Word", "Convert to DOCX")}
                        {renderFeatureCard("pdf-to-excel", <FileSpreadsheet className="w-6 h-6" />, "To Excel", "Convert to XLSX")}
                        {renderFeatureCard("pdf-to-jpg", <ImageIcon className="w-6 h-6" />, "To JPG", "Extract images")}
                    </div>
                </TabsContent>

                <TabsContent value="edit" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {renderFeatureCard("watermark-pdf", <Stamp className="w-6 h-6" />, "Watermark", "Add text")}
                        {renderFeatureCard("compress-pdf", <Minimize className="w-6 h-6" />, "Compress", "Reduce size")}
                        {renderFeatureCard("resize-pdf", <Maximize className="w-6 h-6" />, "Resize", "Change size")}
                    </div>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {renderFeatureCard("protect-pdf", <Lock className="w-6 h-6" />, "Protect", "Add password")}
                        {renderFeatureCard("unlock-pdf", <Unlock className="w-6 h-6" />, "Unlock", "Remove password")}
                    </div>
                </TabsContent>
            </Tabs>
        );
    } else if (fileName.match(/\.(jpg|jpeg|png|webp)$/)) {
        return (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="convert">Convert</TabsTrigger>
                    <TabsTrigger value="filters">Filters</TabsTrigger>
                </TabsList>

                <TabsContent value="convert" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {renderFeatureCard("image-to-pdf", <FileIcon className="w-6 h-6" />, "To PDF", "Convert to PDF")}
                        {renderFeatureCard("to-png", <ImageIcon className="w-6 h-6" />, "To PNG", "Convert format")}
                        {renderFeatureCard("to-jpg", <ImageIcon className="w-6 h-6" />, "To JPG", "Convert format")}
                        {renderFeatureCard("to-webp", <ImageIcon className="w-6 h-6" />, "To WebP", "Convert format")}
                        {renderFeatureCard("ocr", <FileText className="w-6 h-6" />, "OCR", "Extract text")}
                        {renderFeatureCard("remove-background", <ImageIcon className="w-6 h-6" />, "Remove BG", "Transparent BG")}
                    </div>
                </TabsContent>

                <TabsContent value="filters" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {renderFeatureCard("grayscale", <ImageIcon className="w-6 h-6" />, "Grayscale", "B&W effect")}
                        {renderFeatureCard("sepia", <ImageIcon className="w-6 h-6" />, "Sepia", "Vintage effect")}
                        {renderFeatureCard("invert", <ImageIcon className="w-6 h-6" />, "Invert", "Invert colors")}
                        {renderFeatureCard("blur", <ImageIcon className="w-6 h-6" />, "Blur", "Blur image")}
                        {renderFeatureCard("sharpen", <ImageIcon className="w-6 h-6" />, "Sharpen", "Enhance details")}
                        {renderFeatureCard("edge", <ImageIcon className="w-6 h-6" />, "Edge Detect", "Find edges")}
                    </div>
                </TabsContent>
            </Tabs>
        );
    } else if (fileName.endsWith('.xlsx')) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {renderFeatureCard("to-pdf", <FileIcon className="w-6 h-6" />, "To PDF", "Convert to PDF")}
                {renderFeatureCard("to-csv", <FileSpreadsheet className="w-6 h-6" />, "To CSV", "Convert to CSV")}
            </div>
        );
    } else if (fileName.endsWith('.docx')) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {renderFeatureCard("to-text", <FileText className="w-6 h-6" />, "To Text", "Extract raw text.")}
                {renderFeatureCard("to-html", <FileText className="w-6 h-6" />, "To HTML", "Convert to HTML.")}
            </div>
        );
    }
    return <p className="text-muted-foreground text-sm">No actions available for this file type.</p>;
}
