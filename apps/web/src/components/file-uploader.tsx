"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { determineProcessingMode, ProcessingMode, formatBytes } from "@/lib/file-utils";
import {
    UploadCloud, Monitor, File as FileIcon, Loader2, Download, Settings2, CheckCircle2,
    FileSpreadsheet, FileText, Image as ImageIcon, FileType, Layers, Scissors,
    Lock, Unlock, Stamp, FileImage, RefreshCw, Maximize, Minimize, X, CloudUpload
} from "lucide-react";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function FileUploader({ initialAction }: { initialAction?: string }) {
    const [files, setFiles] = useState<File[]>([]);
    const [mode, setMode] = useState<ProcessingMode | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [action, setAction] = useState(initialAction || "");
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState("");

    // Helper to determine tab from action
    const getTabFromAction = (act: string) => {
        if (['merge-pdf', 'split-pdf', 'rotate-pdf'].includes(act)) return 'organize';
        if (['pdf-to-image', 'pdf-to-word', 'pdf-to-excel', 'to-pdf', 'to-png', 'to-jpg', 'to-webp', 'ocr'].includes(act)) return 'convert';
        if (['watermark-pdf', 'compress', 'resize', 'rotate', 'flip-h', 'flip-v'].includes(act)) return 'edit';
        if (['protect-pdf', 'unlock-pdf'].includes(act)) return 'security';
        if (['grayscale', 'sepia', 'invert', 'blur', 'sharpen', 'edge', 'pixelate', 'brightness', 'contrast'].includes(act)) return 'filters';
        return 'organize'; // default
    };

    const [activeTab, setActiveTab] = useState(initialAction ? getTabFromAction(initialAction) : "organize");
    const [password, setPassword] = useState("");
    const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");

    // Update action and tab if initialAction changes
    useEffect(() => {
        if (initialAction) {
            setAction(initialAction);
            setActiveTab(getTabFromAction(initialAction));
        }
    }, [initialAction]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFiles(prev => [...prev, ...acceptedFiles]);
            setMode(determineProcessingMode(acceptedFiles[0]));
            setDownloadUrl(null);
            setStatusMessage("");
            // If initialAction is present, keep it, otherwise reset
            if (initialAction) {
                setAction(initialAction);
            } else {
                setAction("");
            }
        }
    }, [initialAction]);

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        if (files.length <= 1) {
            // Only reset action if we are clearing all files and there's no initial action
            if (!initialAction) {
                setAction("");
            }
            setDownloadUrl(null);
        }
    };

    const processImage = async (file: File, processFn: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, img: HTMLImageElement) => void | Promise<void>, type: string = 'image/jpeg', quality: number = 0.9): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context not available"));
                    return;
                }
                canvas.width = img.width;
                canvas.height = img.height;

                await processFn(ctx, canvas, img);

                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Processing failed"));
                }, type, quality);
            };
            img.onerror = reject;
        });
    };

    const performOCR = async (file: File): Promise<Blob> => {
        setStatusMessage("Initializing OCR engine...");
        const worker = await Tesseract.createWorker('eng');
        setStatusMessage("Recognizing text...");
        const ret = await worker.recognize(file);
        await worker.terminate();
        return new Blob([ret.data.text], { type: 'text/plain' });
    };

    // Convolution helper
    const applyConvolution = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, kernel: number[]) => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const side = Math.round(Math.sqrt(kernel.length));
        const halfSide = Math.floor(side / 2);
        const src = data;
        const w = canvas.width;
        const h = canvas.height;
        const output = ctx.createImageData(w, h);
        const dst = output.data;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let r = 0, g = 0, b = 0;
                for (let cy = 0; cy < side; cy++) {
                    for (let cx = 0; cx < side; cx++) {
                        const scy = y + cy - halfSide;
                        const scx = x + cx - halfSide;
                        if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
                            const srcOff = (scy * w + scx) * 4;
                            const wt = kernel[cy * side + cx];
                            r += src[srcOff] * wt;
                            g += src[srcOff + 1] * wt;
                            b += src[srcOff + 2] * wt;
                        }
                    }
                }
                const dstOff = (y * w + x) * 4;
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = src[(y * w + x) * 4 + 3];
            }
        }
        ctx.putImageData(output, 0, 0);
    };

    // Auto-process when files are added if we are on a specific tool page
    useEffect(() => {
        if (initialAction && files.length > 0 && !downloadUrl && !isProcessing && action === initialAction && mode) {
            handleProcess();
        }
    }, [files, initialAction, action, mode]);

    const handleProcess = async () => {
        if (files.length === 0 || !mode || !action) return;

        setIsProcessing(true);
        setDownloadUrl(null);
        setStatusMessage("Processing...");

        try {
            let blob: Blob | null = null;
            let filename = files[0].name.split('.')[0];
            let ext = 'txt';

            if (mode === ProcessingMode.LOCAL) {
                // --- PDF ACTIONS ---
                if (action === "merge-pdf") {
                    const mergedPdf = await PDFDocument.create();
                    for (const file of files) {
                        const pdfBytes = await file.arrayBuffer();
                        const pdf = await PDFDocument.load(pdfBytes);
                        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                        copiedPages.forEach((page) => mergedPdf.addPage(page));
                    }
                    const pdfBytes = await mergedPdf.save();
                    blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                    filename = 'merged';
                    ext = 'pdf';
                } else if (action === "split-pdf") {
                    const pdfBytes = await files[0].arrayBuffer();
                    const pdfDoc = await PDFDocument.load(pdfBytes);
                    const zip = new JSZip();

                    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
                        const newPdf = await PDFDocument.create();
                        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
                        newPdf.addPage(copiedPage);
                        const newPdfBytes = await newPdf.save();
                        zip.file(`page_${i + 1}.pdf`, newPdfBytes);
                    }

                    blob = await zip.generateAsync({ type: "blob" });
                    filename = `${filename}_split`;
                    ext = 'zip';
                } else if (action === "rotate-pdf") {
                    const pdfBytes = await files[0].arrayBuffer();
                    const pdfDoc = await PDFDocument.load(pdfBytes);
                    const pages = pdfDoc.getPages();
                    pages.forEach(page => {
                        page.setRotation(degrees(page.getRotation().angle + 90));
                    });
                    const modifiedPdfBytes = await pdfDoc.save();
                    blob = new Blob([modifiedPdfBytes as any], { type: 'application/pdf' });
                    filename = `${filename}_rotated`;
                    ext = 'pdf';
                } else if (action === "watermark-pdf") {
                    const pdfBytes = await files[0].arrayBuffer();
                    const pdfDoc = await PDFDocument.load(pdfBytes);
                    const pages = pdfDoc.getPages();
                    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

                    pages.forEach(page => {
                        const { width, height } = page.getSize();
                        page.drawText(watermarkText, {
                            x: width / 2 - 100,
                            y: height / 2,
                            size: 50,
                            font: font,
                            color: rgb(0.7, 0.7, 0.7),
                            rotate: degrees(45),
                            opacity: 0.5,
                        });
                    });

                    const modifiedPdfBytes = await pdfDoc.save();
                    blob = new Blob([modifiedPdfBytes as any], { type: 'application/pdf' });
                    filename = `${filename}_watermarked`;
                    ext = 'pdf';
                } else if (action === "protect-pdf") {
                    const pdfBytes = await files[0].arrayBuffer();
                    const pdfDoc = await PDFDocument.load(pdfBytes);
                    alert("Password protection is not currently supported in Local mode.");
                    const encryptedPdfBytes = await pdfDoc.save();
                    blob = new Blob([encryptedPdfBytes as any], { type: 'application/pdf' });
                    filename = `${filename}_protected`;
                    ext = 'pdf';
                } else if (action === "compress-pdf") {
                    // Basic compression by resaving (pdf-lib doesn't support advanced compression yet)
                    const pdfBytes = await files[0].arrayBuffer();
                    const pdfDoc = await PDFDocument.load(pdfBytes);
                    const compressedBytes = await pdfDoc.save({ useObjectStreams: false }); // Sometimes helps
                    blob = new Blob([compressedBytes as any], { type: 'application/pdf' });
                    filename = `${filename}_compressed`;
                    ext = 'pdf';
                } else if (action === "pdf-to-jpg") {
                    const pdfBytes = await files[0].arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
                    const zip = new JSZip();

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const viewport = page.getViewport({ scale: 2.0 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        if (context) {
                            await page.render({ canvasContext: context, viewport: viewport, canvas }).promise;
                            const imgData = canvas.toDataURL('image/jpeg', 0.8);
                            zip.file(`page_${i}.jpg`, imgData.split(',')[1], { base64: true });
                        }
                    }
                    blob = await zip.generateAsync({ type: "blob" });
                    filename = `${filename}_images`;
                    ext = 'zip';
                }

                // --- IMAGE / CONVERT ACTIONS ---
                else if (action === "image-to-pdf") {
                    const pdfDoc = await PDFDocument.create();
                    for (const file of files) {
                        const imgBytes = await file.arrayBuffer();
                        let img;
                        if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
                            img = await pdfDoc.embedJpg(imgBytes);
                        } else if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
                            img = await pdfDoc.embedPng(imgBytes);
                        }

                        if (img) {
                            const page = pdfDoc.addPage([img.width, img.height]);
                            page.drawImage(img, {
                                x: 0,
                                y: 0,
                                width: img.width,
                                height: img.height,
                            });
                        }
                    }
                    const pdfBytes = await pdfDoc.save();
                    blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                    filename = `${filename}_converted`;
                    ext = 'pdf';
                } else if (action === "ocr-pdf" || action === "ocr") {
                    const text = await performOCR(files[0]);
                    blob = text;
                    filename = `${filename}_ocr`;
                    ext = 'txt';
                } else if (action === "word-to-pdf") {
                    const arrayBuffer = await files[0].arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    const pdfDoc = await PDFDocument.create();
                    const page = pdfDoc.addPage();
                    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                    page.drawText(result.value, { x: 50, y: page.getHeight() - 50, size: 12, font });
                    const pdfBytes = await pdfDoc.save();
                    blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                    filename = `${filename}_converted`;
                    ext = 'pdf';
                } else if (action === "excel-to-pdf") {
                    const arrayBuffer = await files[0].arrayBuffer();
                    const workbook = XLSX.read(arrayBuffer);
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const csv = XLSX.utils.sheet_to_csv(worksheet);

                    const pdfDoc = await PDFDocument.create();
                    const page = pdfDoc.addPage();
                    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                    page.drawText(csv, { x: 50, y: page.getHeight() - 50, size: 10, font });
                    const pdfBytes = await pdfDoc.save();
                    blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                    filename = `${filename}_converted`;
                    ext = 'pdf';
                } else if (action === "powerpoint-to-pdf") {
                    const formData = new FormData();
                    formData.append('file', files[0]);

                    const response = await fetch('/convert/pptx-to-pdf', {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        throw new Error(`Conversion failed: ${response.statusText}`);
                    }

                    blob = await response.blob();
                    filename = `${filename}_converted`;
                    ext = 'pdf';
                }
            }

            if (blob) {
                const url = URL.createObjectURL(blob);
                setDownloadUrl(url);
                setStatusMessage("Done!");
            } else {
                setStatusMessage("Action not implemented locally yet.");
            }
        } catch (error) {
            console.error("Processing failed:", error);
            alert("Processing failed. Please check the console for details.");
        } finally {
            setIsProcessing(false);
            setStatusMessage("");
        }
    };

    const triggerDownload = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    // --- RENDER HELPERS ---
    const renderFeatureCard = (id: string, icon: React.ReactNode, title: string, desc: string) => (
        <Card
            key={id}
            className={`cursor-pointer hover:border-primary/50 transition-all hover:scale-105 ${action === id ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}`}
            onClick={() => setAction(id)}
        >
            <CardHeader className="p-4">
                <div className={`mb-2 ${action === id ? 'text-primary' : 'text-muted-foreground'}`}>{icon}</div>
                <CardTitle className="text-sm font-bold">{title}</CardTitle>
                <CardDescription className="text-xs">{desc}</CardDescription>
            </CardHeader>
        </Card>
    );

    const renderTools = () => {
        if (files.length === 0) return null;
        const fileType = files[0].type;
        const fileName = files[0].name;

        if (fileType === 'application/pdf') {
            return (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-4">
                        <TabsTrigger value="organize">Organize</TabsTrigger>
                        <TabsTrigger value="convert">Convert</TabsTrigger>
                        <TabsTrigger value="edit">Edit</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                    </TabsList>
                    <TabsContent value="organize" className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {renderFeatureCard("merge-pdf", <Layers className="w-6 h-6" />, "Merge PDF", "Combine multiple PDFs into one.")}
                        {renderFeatureCard("split-pdf", <Scissors className="w-6 h-6" />, "Split PDF", "Extract pages as separate files.")}
                        {renderFeatureCard("rotate-pdf", <RefreshCw className="w-6 h-6" />, "Rotate PDF", "Rotate all pages 90°.")}
                    </TabsContent>
                    <TabsContent value="convert" className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {renderFeatureCard("pdf-to-image", <FileImage className="w-6 h-6" />, "PDF to JPG", "Convert each page to an image.")}
                        {/* Placeholders for future features */}
                        {renderFeatureCard("pdf-to-word", <FileText className="w-6 h-6" />, "PDF to Word", "Convert PDF to editable Word (Cloud).")}
                        {renderFeatureCard("pdf-to-excel", <FileSpreadsheet className="w-6 h-6" />, "PDF to Excel", "Convert PDF to Excel (Cloud).")}
                    </TabsContent>
                    <TabsContent value="edit" className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {renderFeatureCard("watermark-pdf", <Stamp className="w-6 h-6" />, "Watermark", "Add text watermark.")}
                    </TabsContent>
                    <TabsContent value="security" className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {renderFeatureCard("protect-pdf", <Lock className="w-6 h-6" />, "Protect PDF", "Encrypt with password.")}
                        {renderFeatureCard("unlock-pdf", <Unlock className="w-6 h-6" />, "Unlock PDF", "Remove security (Cloud).")}
                    </TabsContent>
                </Tabs>
            );
        } else if (fileType.startsWith('image/')) {
            return (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="convert">Convert</TabsTrigger>
                        <TabsTrigger value="edit">Edit</TabsTrigger>
                        <TabsTrigger value="filters">Filters</TabsTrigger>
                    </TabsList>
                    <TabsContent value="convert" className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {renderFeatureCard("to-pdf", <FileIcon className="w-6 h-6" />, "Image to PDF", "Convert image to PDF.")}
                        {renderFeatureCard("to-png", <ImageIcon className="w-6 h-6" />, "To PNG", "Convert to PNG format.")}
                        {renderFeatureCard("to-jpg", <ImageIcon className="w-6 h-6" />, "To JPG", "Convert to JPG format.")}
                        {renderFeatureCard("to-webp", <ImageIcon className="w-6 h-6" />, "To WebP", "Convert to WebP format.")}
                        {renderFeatureCard("ocr", <FileText className="w-6 h-6" />, "OCR", "Extract text from image.")}
                    </TabsContent>
                    <TabsContent value="edit" className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {renderFeatureCard("compress", <Minimize className="w-6 h-6" />, "Compress", "Reduce file size.")}
                        {renderFeatureCard("resize", <Maximize className="w-6 h-6" />, "Resize", "Resize to 50%.")}
                        {renderFeatureCard("rotate", <RefreshCw className="w-6 h-6" />, "Rotate", "Rotate 90°.")}
                        {renderFeatureCard("flip-h", <Layers className="w-6 h-6" />, "Flip H", "Mirror horizontally.")}
                        {renderFeatureCard("flip-v", <Layers className="w-6 h-6" />, "Flip V", "Mirror vertically.")}
                    </TabsContent>
                    <TabsContent value="filters" className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {renderFeatureCard("grayscale", <ImageIcon className="w-6 h-6" />, "Grayscale", "Black & white.")}
                        {renderFeatureCard("sepia", <ImageIcon className="w-6 h-6" />, "Sepia", "Vintage look.")}
                        {renderFeatureCard("invert", <ImageIcon className="w-6 h-6" />, "Invert", "Invert colors.")}
                        {renderFeatureCard("blur", <ImageIcon className="w-6 h-6" />, "Blur", "Soft blur.")}
                        {renderFeatureCard("sharpen", <ImageIcon className="w-6 h-6" />, "Sharpen", "Enhance details.")}
                        {renderFeatureCard("edge", <ImageIcon className="w-6 h-6" />, "Edge Detect", "Highlight edges.")}
                        {renderFeatureCard("pixelate", <ImageIcon className="w-6 h-6" />, "Pixelate", "Pixel effect.")}
                        {renderFeatureCard("brightness", <ImageIcon className="w-6 h-6" />, "Brightness", "Brighten image.")}
                        {renderFeatureCard("contrast", <ImageIcon className="w-6 h-6" />, "Contrast", "Increase contrast.")}
                    </TabsContent>
                </Tabs>
            );
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            return (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {renderFeatureCard("to-csv", <FileSpreadsheet className="w-6 h-6" />, "To CSV", "Convert to CSV.")}
                    {renderFeatureCard("to-json", <FileSpreadsheet className="w-6 h-6" />, "To JSON", "Convert to JSON.")}
                    {renderFeatureCard("to-html", <FileSpreadsheet className="w-6 h-6" />, "To HTML", "Convert to HTML.")}
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
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div
                {...getRootProps()}
                className={`
                    border-3 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 ease-in-out
                    flex flex-col items-center justify-center gap-6 min-h-[320px] relative overflow-hidden group
                    ${isDragActive
                        ? "border-primary bg-primary/10 scale-[1.02] shadow-2xl shadow-primary/20"
                        : "border-border/50 hover:border-primary/50 hover:bg-muted/30 hover:scale-[1.01] hover:shadow-xl shadow-lg bg-card/50"
                    }
                `}
            >
                <input {...getInputProps()} />

                {files.length > 0 ? (
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
                ) : (
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
                )}
            </div>

            {files.length > 0 && (
                <div className="mt-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground">Convert or Download</h3>
                        {mode && (
                            <span className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${mode === ProcessingMode.LOCAL ? "bg-green-500/20 text-green-400 border border-green-500/20" : "bg-purple-500/20 text-purple-400 border border-purple-500/20"}`}>
                                {mode === ProcessingMode.LOCAL ? <Monitor className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
                                {mode === ProcessingMode.LOCAL ? "Local (WASM)" : "Cloud (Server)"}
                            </span>
                        )}
                    </div>

                    {/* Only show tool selection if no specific tool was pre-selected via URL */
                        !initialAction && renderTools()}

                    {/* Additional Inputs for specific actions */}
                    {action === "protect-pdf" && (
                        <div className="max-w-xs animate-in fade-in slide-in-from-left-2">
                            <Label>Set Password</Label>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="mt-1.5" />
                        </div>
                    )}
                    {action === "watermark-pdf" && (
                        <div className="max-w-xs animate-in fade-in slide-in-from-left-2">
                            <Label>Watermark Text</Label>
                            <Input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="CONFIDENTIAL" className="mt-1.5" />
                        </div>
                    )}

                    <div className="flex flex-col gap-4 mt-8">
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
                                    link.download = files.length > 1 && action === 'merge-pdf' ? 'merged.pdf' : (downloadUrl.endsWith('.zip') ? 'files.zip' : `processed_file.${action.includes('to-pdf') || action.includes('merge') || action.includes('rotate') || action.includes('watermark') ? 'pdf' : 'txt'}`);
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                            >
                                <CheckCircle2 className="mr-2 h-5 w-5" />
                                Download Result
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
