"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { determineProcessingMode, ProcessingMode } from "@/lib/file-utils";
import { PdfService } from '@/services/pdf-service';
import { extractPdfPages, reorderPdfPages } from '@/lib/pdf/operations';
import { parsePageRanges } from '@/lib/pdf/ranges';
import { renderPdfPageThumbnails, type PageThumbnail } from '@/lib/pdf/thumbnails';
import { PDFDocument } from 'pdf-lib';
import { CropMargins } from './configs/crop-config';
import { ImageService } from '@/services/image-service';
import mammoth from 'mammoth';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Monitor, UploadCloud } from "lucide-react";

import { DropzonePlaceholder } from "./dropzone-placeholder";
import { FileList } from "./file-list";
import { ToolSelector } from "./tool-selector";
import { ActionConfig } from "./action-config";
import { ProcessingStatus } from "./processing-status";

export default function FileUploader({ initialAction }: { initialAction?: string }) {
    const [files, setFiles] = useState<File[]>([]);
    const [mode, setMode] = useState<ProcessingMode | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [action, setAction] = useState(initialAction || "");
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [downloadFilename, setDownloadFilename] = useState<string>("");
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
    const [startPage, setStartPage] = useState<number>(1);
    const [endPage, setEndPage] = useState<number>(1);
    const [pagesToRemove, setPagesToRemove] = useState<string>("");
    const [extractPages, setExtractPages] = useState<string>("");
    const [extractTotalPages, setExtractTotalPages] = useState<number>(0);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [generatingThumbnails, setGeneratingThumbnails] = useState(false);
    const [organizeThumbnails, setOrganizeThumbnails] = useState<PageThumbnail[]>([]);
    const [organizeOrder, setOrganizeOrder] = useState<number[]>([]);

    // Compression State
    const [compressionMode, setCompressionMode] = useState<"percentage" | "target">("percentage");
    const [compressionPercentage, setCompressionPercentage] = useState<number>(50);
    const [targetSize, setTargetSize] = useState<number>(100);
    const [targetUnit, setTargetUnit] = useState<"KB" | "MB">("KB");

    // Resize State
    const [resizeWidth, setResizeWidth] = useState<number>(100);
    const [resizeHeight, setResizeHeight] = useState<number>(100);
    const [resizeUnit, setResizeUnit] = useState<"pixels" | "percentage">("percentage");
    const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);
    const [resizeMode, setResizeMode] = useState<"stretch" | "crop" | "fit">("stretch");
    const [resizeDpi, setResizeDpi] = useState<number>(72);
    const [resizeFormat, setResizeFormat] = useState<"jpg" | "png" | "webp">("jpg");
    const [resizeQuality, setResizeQuality] = useState<number>(90);
    const [resizeBackground, setResizeBackground] = useState<string>("#ffffff");
    const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);

    // Crop State
    const [cropMargins, setCropMargins] = useState<CropMargins>({ top: 0, right: 0, bottom: 0, left: 0 });

    // Load image dimensions when file changes
    useEffect(() => {
        if (files.length > 0 && action === 'resize-image') {
            const img = new Image();
            const objectUrl = URL.createObjectURL(files[0]);
            img.onload = () => {
                setOriginalDimensions({ width: img.width, height: img.height });
                // Only set initial values if they haven't been touched or if it's a new file
                // For simplicity, let's reset to original on new file load
                setResizeWidth(img.width);
                setResizeHeight(img.height);
                URL.revokeObjectURL(objectUrl);
            };
            img.src = objectUrl;
        } else {
            setOriginalDimensions(null);
        }
    }, [files, action]);

    // Generate thumbnails when a PDF is uploaded and action is remove-pages
    useEffect(() => {
        const generateThumbnails = async () => {
            if (files.length > 0 && files[0].type === 'application/pdf' && action === 'remove-pages') {
                setGeneratingThumbnails(true);
                setThumbnails([]); // Clear existing
                try {
                    const thumbs = await PdfService.getThumbnails(files[0]);
                    setThumbnails(thumbs);
                } catch (error) {
                    console.error("Error generating thumbnails:", error);
                } finally {
                    setGeneratingThumbnails(false);
                }
            } else {
                setThumbnails([]);
            }
        };

        generateThumbnails();
    }, [files, action]);

    // Generate thumbnails when a PDF is uploaded and action is organize-pdf
    useEffect(() => {
        let cancelled = false;

        const generateOrganizeThumbnails = async () => {
            if (files.length > 0 && files[0].type === 'application/pdf' && action === 'organize-pdf') {
                setGeneratingThumbnails(true);
                setOrganizeThumbnails([]);
                setOrganizeOrder([]);
                try {
                    const arrayBuffer = await files[0].arrayBuffer();
                    const thumbs = await renderPdfPageThumbnails(arrayBuffer);
                    if (!cancelled) {
                        setOrganizeThumbnails(thumbs);
                        setOrganizeOrder(thumbs.map((thumb) => thumb.index));
                    }
                } catch (error) {
                    console.error("Error generating thumbnails:", error);
                } finally {
                    if (!cancelled) setGeneratingThumbnails(false);
                }
            } else if (!cancelled) {
                setOrganizeThumbnails([]);
                setOrganizeOrder([]);
            }
        };

        generateOrganizeThumbnails();
        return () => {
            cancelled = true;
        };
    }, [files, action]);

    // Determine the total page count for the extract-pages range selector
    useEffect(() => {
        let cancelled = false;

        const loadPageCount = async () => {
            if (files.length > 0 && files[0].type === 'application/pdf' && action === 'extract-pages') {
                try {
                    const thumbs = await PdfService.getThumbnails(files[0]);
                    if (!cancelled) setExtractTotalPages(thumbs.length);
                } catch (error) {
                    console.error("Error determining page count:", error);
                    if (!cancelled) setExtractTotalPages(0);
                }
            } else if (!cancelled) {
                setExtractTotalPages(0);
            }
        };

        loadPageCount();
        return () => {
            cancelled = true;
        };
    }, [files, action]);

    // Clear download URL when action changes
    useEffect(() => {
        setDownloadUrl(null);
        setStatusMessage("");
        setPagesToRemove(""); // Reset input
        setExtractPages(""); // Reset input
    }, [action]);

    // Update action and tab if initialAction changes
    useEffect(() => {
        if (initialAction) {
            setAction(initialAction);
            setActiveTab(getTabFromAction(initialAction));
        }
    }, [initialAction]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Check for file size limit (50MB)
        const MAX_SIZE = 50 * 1024 * 1024; // 50MB
        const largeFiles = acceptedFiles.filter(file => file.size > MAX_SIZE);

        if (largeFiles.length > 0) {
            alert("You are uploading a larger file. To process large files you must take premium service.");
            // Filter out large files
            acceptedFiles = acceptedFiles.filter(file => file.size <= MAX_SIZE);
        }

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

    // Auto-process when files are added if we are on a specific tool page
    useEffect(() => {
        // Don't auto-process for tools that require user input
        const interactiveTools = ['remove-pages', 'split-pdf', 'protect-pdf', 'watermark-pdf', 'resize-image', 'compress-image', 'organize-pdf'];

        if (initialAction && files.length > 0 && !downloadUrl && !isProcessing && action === initialAction && mode) {
            if (!interactiveTools.includes(initialAction)) {
                handleProcess();
            }
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
                    blob = await PdfService.mergePdfs(files);
                    filename = 'merged';
                    ext = 'pdf';
                } else if (action === "split-pdf") {
                    let start = startPage;
                    let end = endPage;
                    if (start < 1) start = 1;
                    blob = await PdfService.splitPdf(files[0], start, end);
                    filename = `${filename}_split_${start}-${end}`;
                    ext = 'pdf';
                } else if (action === "remove-pages") {
                    blob = await PdfService.removePages(files[0], pagesToRemove);
                    filename = `${filename}_removed`;
                    ext = 'pdf';
                } else if (action === "extract-pages") {
                    const parsed = parsePageRanges(extractPages, extractTotalPages);
                    if (parsed.error) {
                        throw new Error(parsed.error);
                    }
                    if (parsed.indices.length === 0) {
                        throw new Error("Select at least one page to extract.");
                    }
                    const arrayBuffer = await files[0].arrayBuffer();
                    const result = await extractPdfPages(arrayBuffer, parsed.indices);
                    blob = new Blob([new Uint8Array(result.bytes)], { type: 'application/pdf' });
                    filename = `${filename}_extracted`;
                    ext = 'pdf';
                } else if (action === "organize-pdf") {
                    const arrayBuffer = await files[0].arrayBuffer();
                    const order = organizeOrder.length
                        ? organizeOrder
                        : organizeThumbnails.map((thumb) => thumb.index);
                    if (!order.length) {
                        throw new Error("No pages available to organize.");
                    }
                    const result = await reorderPdfPages(arrayBuffer, order);
                    blob = new Blob([new Uint8Array(result.bytes)], { type: 'application/pdf' });
                    filename = `${filename}_organized`;
                    ext = 'pdf';
                } else if (action === "rotate-pdf") {
                    blob = await PdfService.rotatePdf(files[0]);
                    filename = `${filename}_rotated`;
                    ext = 'pdf';
                } else if (action === "watermark-pdf") {
                    blob = await PdfService.watermarkPdf(files[0], watermarkText);
                    filename = `${filename}_watermarked`;
                    ext = 'pdf';
                } else if (action === "protect-pdf") {
                    blob = await PdfService.protectPdf(files[0], password);
                    filename = `${filename}_protected`;
                    ext = 'pdf';
                } else if (action === "unlock-pdf") {
                    blob = await PdfService.unlockPdf(files[0], password);
                    filename = `${filename}_unlocked`;
                    ext = 'pdf';
                } else if (action === "compress-pdf") {
                    blob = await PdfService.compressPdf(files[0]);
                    filename = `${filename}_compressed`;
                    ext = 'pdf';
                } else if (action === "pdf-to-jpg") {
                    blob = await PdfService.pdfToImages(files[0]);
                    filename = `${filename}_images`;
                    ext = 'zip';
                } else if (action === "image-to-pdf") {
                    blob = await PdfService.imageToPdf(files);
                    filename = 'images_converted';
                    ext = 'pdf';
                } else if (action === "crop-pdf") {
                    const arrayBuffer = await files[0].arrayBuffer();
                    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
                    const pages = doc.getPages();

                    const top = Math.max(0, cropMargins.top);
                    const right = Math.max(0, cropMargins.right);
                    const bottom = Math.max(0, cropMargins.bottom);
                    const left = Math.max(0, cropMargins.left);

                    pages.forEach((page) => {
                        const { width, height } = page.getSize();
                        const cropWidth = width - left - right;
                        const cropHeight = height - top - bottom;
                        if (cropWidth <= 0 || cropHeight <= 0) {
                            throw new Error("Crop margins are too large for one or more pages.");
                        }
                        page.setCropBox(left, bottom, cropWidth, cropHeight);
                    });

                    const bytes = await doc.save();
                    blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
                    filename = `${filename}_cropped`;
                    ext = 'pdf';
                }
                // --- IMAGE ACTIONS ---
                else if (action === "to-png") {
                    blob = await ImageService.toFormat(files[0], 'png');
                    ext = 'png';
                } else if (action === "to-jpg") {
                    blob = await ImageService.toFormat(files[0], 'jpeg');
                    ext = 'jpg';
                } else if (action === "to-webp") {
                    blob = await ImageService.toFormat(files[0], 'webp');
                    ext = 'webp';
                } else if (action === "grayscale") {
                    blob = await ImageService.grayscale(files[0]);
                    filename = `${filename}_grayscale`;
                    ext = 'jpg';
                } else if (action === "sepia") {
                    blob = await ImageService.sepia(files[0]);
                    filename = `${filename}_sepia`;
                    ext = 'jpg';
                } else if (action === "invert") {
                    blob = await ImageService.invert(files[0]);
                    filename = `${filename}_invert`;
                    ext = 'jpg';
                } else if (action === "blur") {
                    blob = await ImageService.blur(files[0]);
                    filename = `${filename}_blur`;
                    ext = 'jpg';
                } else if (action === "brightness") {
                    blob = await ImageService.brightness(files[0]);
                    filename = `${filename}_brightness`;
                    ext = 'jpg';
                } else if (action === "contrast") {
                    blob = await ImageService.contrast(files[0]);
                    filename = `${filename}_contrast`;
                    ext = 'jpg';
                } else if (action === "pixelate") {
                    blob = await ImageService.pixelate(files[0]);
                    filename = `${filename}_pixelate`;
                    ext = 'jpg';
                } else if (action === "sharpen") {
                    blob = await ImageService.sharpen(files[0]);
                    filename = `${filename}_sharpen`;
                    ext = 'jpg';
                } else if (action === "edge") {
                    blob = await ImageService.edge(files[0]);
                    filename = `${filename}_edge`;
                    ext = 'jpg';
                } else if (action === "ocr") {
                    blob = await ImageService.performOCR(files[0], setStatusMessage);
                    ext = 'txt';
                } else if (action === "compress-image") {
                    setStatusMessage("Compressing image...");
                    blob = await ImageService.compress(files[0], {
                        mode: compressionMode,
                        percentage: compressionPercentage,
                        targetSize: targetSize,
                        targetUnit: targetUnit
                    });
                    filename = `${filename}_compressed`;
                    ext = files[0].name.split('.').pop() || 'jpg';
                } else if (action === "resize-image") {
                    setStatusMessage("Resizing image...");
                    blob = await ImageService.resize(files[0], {
                        width: resizeWidth,
                        height: resizeHeight,
                        unit: resizeUnit,
                        maintainAspectRatio,
                        mode: resizeMode,
                        dpi: resizeDpi,
                        format: resizeFormat,
                        quality: resizeQuality,
                        background: resizeBackground
                    });
                    filename = `${filename}_resized`;
                    ext = resizeFormat;
                }
                // --- DOCUMENT ACTIONS ---
                else if (action === "to-text") {
                    const arrayBuffer = await files[0].arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    blob = new Blob([result.value], { type: 'text/plain' });
                    ext = 'txt';
                } else if (action === "to-html") {
                    const arrayBuffer = await files[0].arrayBuffer();
                    const result = await mammoth.convertToHtml({ arrayBuffer });
                    blob = new Blob([result.value], { type: 'text/html' });
                    ext = 'html';
                } else if (action === "word-to-pdf") {
                    const arrayBuffer = await files[0].arrayBuffer();
                    const result = await mammoth.convertToHtml({ arrayBuffer });
                    const html = result.value;

                    // Create an iframe to isolate styles
                    const iframe = document.createElement('iframe');
                    iframe.style.position = 'absolute';
                    iframe.style.left = '-9999px';
                    iframe.style.top = '0';
                    iframe.style.width = '800px'; // Approx A4 width in pixels
                    document.body.appendChild(iframe);

                    try {
                        const doc = iframe.contentDocument || iframe.contentWindow?.document;
                        if (!doc) throw new Error("Could not access iframe document");

                        doc.open();
                        doc.write(`
                            <html>
                            <head>
                                <style>
                                    body {
                                        font-family: 'Times New Roman', Times, serif;
                                        font-size: 12pt;
                                        line-height: 1.6;
                                        color: #333;
                                        background: white;
                                        margin: 0;
                                        padding: 40px; /* More generous padding */
                                        width: 100%;
                                        box-sizing: border-box;
                                        text-align: justify;
                                    }
                                    p { margin-bottom: 1.2em; text-indent: 1em; }
                                    h1, h2, h3, h4, h5, h6 { 
                                        margin-top: 2em; 
                                        margin-bottom: 0.8em; 
                                        font-weight: bold; 
                                        color: #000;
                                        line-height: 1.2;
                                    }
                                    h1 { font-size: 24pt; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                                    h2 { font-size: 18pt; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                                    h3 { font-size: 14pt; }
                                    img { max-width: 100%; height: auto; display: block; margin: 20px auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                                    table { 
                                        border-collapse: collapse; 
                                        width: 100%; 
                                        margin-bottom: 2em; 
                                        font-size: 11pt;
                                    }
                                    td, th { 
                                        border: 1px solid #e2e8f0; 
                                        padding: 12px; 
                                        text-align: left; 
                                        }
                                    th { background-color: #f8fafc; font-weight: bold; }
                                    blockquote {
                                        border-left: 4px solid #e2e8f0;
                                        margin: 1.5em 0;
                                        padding-left: 1em;
                                        color: #64748b;
                                        font-style: italic;
                                    }
                                    a { color: #2563eb; text-decoration: none; }
                                    ul, ol { margin-bottom: 1.2em; padding-left: 2em; }
                                    li { margin-bottom: 0.5em; }
                                </style>
                            </head>
                            <body>
                                ${html}
                            </body>
                            </html>
                        `);
                        doc.close();

                        // Wait for images to load
                        await new Promise(resolve => {
                            const images = doc.getElementsByTagName('img');
                            if (images.length === 0) {
                                resolve(null);
                                return;
                            }

                            let loaded = 0;
                            const check = () => {
                                loaded++;
                                if (loaded >= images.length) resolve(null);
                            };

                            Array.from(images).forEach(img => {
                                if (img.complete) check();
                                else {
                                    img.onload = check;
                                    img.onerror = check;
                                }
                            });
                        });

                        // Use jsPDF.html for automatic pagination
                        const pdf = new jsPDF('p', 'mm', 'a4');
                        await new Promise<void>((resolve) => {
                            (pdf as any).html(doc.body, {
                                callback: (doc: jsPDF) => {
                                    blob = doc.output('blob');
                                    resolve();
                                },
                                x: 10,
                                y: 10,
                                width: 190, // A4 width (210) - margins (20)
                                windowWidth: 800,
                                html2canvas: html2canvas as any,
                                autoPaging: 'text'
                            });
                        });

                        filename = `${filename}_converted`;
                        ext = 'pdf';
                    } finally {
                        document.body.removeChild(iframe);
                    }
                }
            } else if (mode === ProcessingMode.CLOUD) {
            }
            if (blob) {
                const url = URL.createObjectURL(blob);
                setDownloadUrl(url);
                setDownloadFilename(`${filename}.${ext}`);
                setStatusMessage("Done!");
            } else {
                throw new Error("No output generated.");
            }

        } catch (error: any) {
            console.error("Processing failed:", error);
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during processing.";
            setStatusMessage(`Error: ${errorMessage}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

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
                    <FileList files={files} removeFile={removeFile} />
                ) : (
                    <DropzonePlaceholder isDragActive={isDragActive} />
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
                        !initialAction && (
                            <ToolSelector
                                files={files}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                action={action}
                                setAction={setAction}
                                getTabFromAction={getTabFromAction}
                            />
                        )}

                    <ActionConfig
                        action={action}
                        files={files}
                        setFiles={setFiles}
                        password={password}
                        setPassword={setPassword}
                        watermarkText={watermarkText}
                        setWatermarkText={setWatermarkText}
                        startPage={startPage}
                        setStartPage={setStartPage}
                        endPage={endPage}
                        setEndPage={setEndPage}
                        pagesToRemove={pagesToRemove}
                        setPagesToRemove={setPagesToRemove}
                        extractPages={extractPages}
                        setExtractPages={setExtractPages}
                        extractTotalPages={extractTotalPages}
                        thumbnails={thumbnails}
                        generatingThumbnails={generatingThumbnails}
                        compressionMode={compressionMode}
                        setCompressionMode={setCompressionMode}
                        compressionPercentage={compressionPercentage}
                        setCompressionPercentage={setCompressionPercentage}
                        targetSize={targetSize}
                        setTargetSize={setTargetSize}
                        targetUnit={targetUnit}
                        setTargetUnit={setTargetUnit}
                        // Resize Props
                        resizeWidth={resizeWidth}
                        setResizeWidth={setResizeWidth}
                        resizeHeight={resizeHeight}
                        setResizeHeight={setResizeHeight}
                        resizeUnit={resizeUnit}
                        setResizeUnit={setResizeUnit}
                        maintainAspectRatio={maintainAspectRatio}
                        setMaintainAspectRatio={setMaintainAspectRatio}
                        resizeMode={resizeMode}
                        setResizeMode={setResizeMode}
                        resizeDpi={resizeDpi}
                        setResizeDpi={setResizeDpi}
                        resizeFormat={resizeFormat}
                        setResizeFormat={setResizeFormat}
                        resizeQuality={resizeQuality}
                        setResizeQuality={setResizeQuality}
                        resizeBackground={resizeBackground}
                        setResizeBackground={setResizeBackground}
                        originalDimensions={originalDimensions}
                        cropMargins={cropMargins}
                        setCropMargins={setCropMargins}
                        organizeThumbnails={organizeThumbnails}
                        organizeOrder={organizeOrder}
                        setOrganizeOrder={setOrganizeOrder}
                    />

                    <ProcessingStatus
                        isProcessing={isProcessing}
                        statusMessage={statusMessage}
                        downloadUrl={downloadUrl}
                        downloadFilename={downloadFilename}
                        handleProcess={handleProcess}
                        mode={mode}
                        action={action}
                    />
                </div>
            )}
        </div>
    );
}
