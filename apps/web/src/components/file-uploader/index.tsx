"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { determineProcessingMode, ProcessingMode } from "@/lib/file-utils";
import { PdfService } from '@/services/pdf-service';
import type { PageNumberPosition, PageNumberFormat } from '@/lib/pdf/page-numbers';
import type { CropMargins } from '@/lib/pdf/crop';
import type { PageBox } from '@/lib/pdf/rasterize';
import type { OrganizePage } from './configs/organize-config';
import type { SignatureState } from './configs/sign-config';
import type { TextAnnotation } from './configs/edit-config';
import type { ScanPage } from './configs/scan-config';
import { ImageService } from '@/services/image-service';
import { htmlToPdfBlob, htmlFileToPdf } from '@/lib/html-to-pdf';
import { Monitor, UploadCloud } from "lucide-react";

import { DropzonePlaceholder } from "./dropzone-placeholder";
import { FileList } from "./file-list";
import { ToolSelector } from "./tool-selector";
import { ActionConfig } from "./action-config";
import { ProcessingStatus } from "./processing-status";

/** Tools whose options are chosen visually, so they need page previews. */
const THUMBNAIL_TOOLS = [
    'remove-pages', 'extract-pages', 'organize-pdf', 'crop-pdf', 'sign-pdf', 'redact-pdf', 'edit-pdf',
];

export default function FileUploader({ initialAction }: { initialAction?: string }) {
    const [files, setFiles] = useState<File[]>([]);
    const [mode, setMode] = useState<ProcessingMode | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [action, setAction] = useState(initialAction || "");
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [downloadFilename, setDownloadFilename] = useState<string>("");
    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

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
    const [pagesToExtract, setPagesToExtract] = useState<string>("");
    const [pageNumberPosition, setPageNumberPosition] = useState<PageNumberPosition>("bottom-center");
    const [pageNumberFormat, setPageNumberFormat] = useState<PageNumberFormat>("n");
    const [organizePages, setOrganizePages] = useState<OrganizePage[]>([]);
    const [cropMargins, setCropMargins] = useState<CropMargins>({ top: 5, right: 5, bottom: 5, left: 5 });
    const [cropUnit, setCropUnit] = useState<'percent' | 'mm'>('percent');
    const [redactBoxes, setRedactBoxes] = useState<PageBox[]>([]);
    const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
    const [scanPages, setScanPages] = useState<ScanPage[]>([]);
    const [scanEnhance, setScanEnhance] = useState(true);
    const [signature, setSignature] = useState<SignatureState>({
        dataUrl: '', typedName: '', mode: 'draw', page: 0, x: 0.55, y: 0.75, width: 0.3, includeDate: false,
    });
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [generatingThumbnails, setGeneratingThumbnails] = useState(false);

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
            if (files.length > 0 && files[0].type === 'application/pdf' && THUMBNAIL_TOOLS.includes(action)) {
                console.log("Starting thumbnail generation...");
                setGeneratingThumbnails(true);
                setThumbnails([]); // Clear existing
                try {
                    const thumbs = await PdfService.getThumbnails(files[0]);
                    setThumbnails(thumbs);
                    // Organize works on a page list, so seed it from what was rendered.
                    setOrganizePages(
                        thumbs.map((_, index) => ({ index, rotation: 0, removed: false })),
                    );
                } catch (error) {
                    console.error("Error generating thumbnails:", error);
                } finally {
                    setGeneratingThumbnails(false);
                }
            } else {
                setThumbnails([]);
                setOrganizePages([]);
            }
        };

        generateThumbnails();
    }, [files, action]);

    // Visual selections (boxes, signature placement, text) belong to one file and
    // one tool — carrying them over to another would silently edit the wrong pages.
    useEffect(() => {
        setRedactBoxes([]);
        setTextAnnotations([]);
        setSignature((current) => ({ ...current, page: 0 }));
    }, [files, action]);

    // Clear download URL when action changes
    useEffect(() => {
        setDownloadUrl(null);
        setStatusMessage("");
        setPagesToRemove(""); // Reset input
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
        const interactiveTools = [
            'remove-pages', 'extract-pages', 'add-page-numbers', 'split-pdf', 'protect-pdf', 'unlock-pdf',
            'watermark-pdf', 'resize-image', 'compress-image', 'organize-pdf', 'crop-pdf', 'sign-pdf',
            'redact-pdf', 'edit-pdf', 'scan-pdf', 'compare-pdf',
        ];

        if (initialAction && files.length > 0 && !downloadUrl && !isProcessing && action === initialAction && mode) {
            if (!interactiveTools.includes(initialAction)) {
                handleProcess();
            }
        }
    }, [files, initialAction, action, mode]);

    const handleProcess = async () => {
        // Scan to PDF can run purely from camera captures, so it needs no upload.
        const cameraOnly = action === 'scan-pdf' && scanPages.length > 0;
        if (!action || (!cameraOnly && (files.length === 0 || !mode))) return;

        setIsProcessing(true);
        setDownloadUrl(null);
        setErrorMessage("");
        setStatusMessage("Processing...");

        try {
            let blob: Blob | null = null;
            let filename = files[0]?.name.split('.')[0] ?? 'document';
            let ext = 'txt';

            if (mode === ProcessingMode.LOCAL || cameraOnly) {
                // --- PDF ACTIONS ---
                if (action === "merge-pdf") {
                    blob = await PdfService.mergePdfs(files);
                    filename = 'merged';
                    ext = 'pdf';
                } else if (action === "split-pdf") {
                    const start = Math.max(1, startPage);
                    const end = endPage;
                    blob = await PdfService.splitPdf(files[0], start, end);
                    filename = `${filename}_split_${start}-${end}`;
                    ext = 'pdf';
                } else if (action === "remove-pages") {
                    blob = await PdfService.removePages(files[0], pagesToRemove);
                    filename = `${filename}_removed`;
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
                } else if (action === "extract-pages") {
                    blob = await PdfService.extractPages(files[0], pagesToExtract);
                    filename = `${filename}_extracted`;
                    ext = 'pdf';
                } else if (action === "add-page-numbers") {
                    blob = await PdfService.addPageNumbers(files[0], {
                        position: pageNumberPosition,
                        format: pageNumberFormat,
                    });
                    filename = `${filename}_numbered`;
                    ext = 'pdf';
                } else if (action === "repair-pdf") {
                    blob = await PdfService.repairPdf(files[0]);
                    filename = `${filename}_repaired`;
                    ext = 'pdf';
                } else if (action === "ocr-pdf") {
                    blob = await PdfService.ocrPdf(files[0], setStatusMessage);
                    filename = `${filename}_text`;
                    ext = 'txt';
                } else if (action === "pdf-to-word") {
                    blob = await PdfService.pdfToWord(files[0]);
                    filename = `${filename}_converted`;
                    ext = 'docx';
                } else if (action === "pdf-to-excel") {
                    blob = await PdfService.pdfToExcel(files[0]);
                    filename = `${filename}_converted`;
                    ext = 'xlsx';
                } else if (action === "organize-pdf") {
                    const kept = organizePages.filter((page) => !page.removed);
                    if (kept.length === 0) throw new Error('Keep at least one page.');
                    const rotations: Record<number, number> = {};
                    kept.forEach((page, position) => {
                        if (page.rotation !== 0) rotations[position] = page.rotation;
                    });
                    blob = await PdfService.organizePdf(files[0], kept.map((page) => page.index), rotations);
                    filename = `${filename}_organized`;
                    ext = 'pdf';
                } else if (action === "crop-pdf") {
                    blob = await PdfService.cropPdf(files[0], cropMargins, { unit: cropUnit });
                    filename = `${filename}_cropped`;
                    ext = 'pdf';
                } else if (action === "redact-pdf") {
                    blob = await PdfService.redactPdf(files[0], redactBoxes, (percent) =>
                        setStatusMessage(`Redacting... ${percent}%`),
                    );
                    filename = `${filename}_redacted`;
                    ext = 'pdf';
                } else if (action === "sign-pdf") {
                    const placement = { page: signature.page, x: signature.x, y: signature.y, width: signature.width };
                    const dateLabel = signature.includeDate ? new Date().toLocaleDateString() : undefined;
                    if (signature.mode === 'draw') {
                        if (!signature.dataUrl) throw new Error('Draw your signature first.');
                        const image = await (await fetch(signature.dataUrl)).blob();
                        blob = await PdfService.signPdf(files[0], { type: 'image', image, placement, dateLabel });
                    } else {
                        blob = await PdfService.signPdf(files[0], {
                            type: 'text', text: signature.typedName, font: 'Times-Italic', placement, dateLabel,
                        });
                    }
                    filename = `${filename}_signed`;
                    ext = 'pdf';
                } else if (action === "edit-pdf") {
                    blob = await PdfService.editPdf(files[0], textAnnotations);
                    filename = `${filename}_edited`;
                    ext = 'pdf';
                } else if (action === "compare-pdf") {
                    if (files.length < 2) throw new Error('Add two PDFs to compare.');
                    const { blob: report, result } = await PdfService.comparePdfs(files[0], files[1]);
                    blob = report;
                    setStatusMessage(
                        result.identical ? 'The text is identical.' : `${result.changedPages} page(s) differ.`,
                    );
                    filename = 'comparison';
                    ext = 'html';
                } else if (action === "scan-pdf") {
                    const sources = scanPages.length > 0 ? scanPages.map((page) => page.blob) : files;
                    blob = await PdfService.scanToPdf(sources, scanEnhance);
                    filename = 'scan';
                    ext = 'pdf';
                } else if (action === "pdf-to-powerpoint") {
                    blob = await PdfService.pdfToPowerPoint(files[0], (percent) =>
                        setStatusMessage(`Building slides... ${percent}%`),
                    );
                    filename = `${filename}_slides`;
                    ext = 'pptx';
                } else if (action === "pdf-to-pdfa") {
                    blob = await PdfService.archivePdf(files[0], (percent) =>
                        setStatusMessage(`Flattening... ${percent}%`),
                    );
                    filename = `${filename}_archive`;
                    ext = 'pdf';
                } else if (action === "excel-to-pdf") {
                    blob = await PdfService.excelToPdf(files[0]);
                    filename = `${filename}_converted`;
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
                    const { default: mammoth } = await import('mammoth');
                    const arrayBuffer = await files[0].arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    blob = new Blob([result.value], { type: 'text/plain' });
                    ext = 'txt';
                } else if (action === "to-html") {
                    const { default: mammoth } = await import('mammoth');
                    const arrayBuffer = await files[0].arrayBuffer();
                    const result = await mammoth.convertToHtml({ arrayBuffer });
                    blob = new Blob([result.value], { type: 'text/html' });
                    ext = 'html';
                } else if (action === "word-to-pdf") {
                    setStatusMessage("Reading document...");
                    const { default: mammoth } = await import('mammoth');
                    const arrayBuffer = await files[0].arrayBuffer();
                    const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
                    setStatusMessage("Rendering PDF...");
                    blob = await htmlToPdfBlob(html);
                    filename = `${filename}_converted`;
                    ext = 'pdf';
                } else if (action === "html-to-pdf") {
                    setStatusMessage("Rendering PDF...");
                    blob = await htmlFileToPdf(files[0]);
                    filename = `${filename}_converted`;
                    ext = 'pdf';
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

        } catch (error: unknown) {
            console.error("Processing failed:", error);
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : "An unexpected error occurred during processing.";
            setErrorMessage(message);
            setStatusMessage("");
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

            {/* Scan to PDF shows its camera panel before anything is uploaded. */}
            {(files.length > 0 || action === 'scan-pdf') && (
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
                        pagesToExtract={pagesToExtract}
                        setPagesToExtract={setPagesToExtract}
                        pageNumberPosition={pageNumberPosition}
                        setPageNumberPosition={setPageNumberPosition}
                        pageNumberFormat={pageNumberFormat}
                        setPageNumberFormat={setPageNumberFormat}
                        organizePages={organizePages}
                        setOrganizePages={setOrganizePages}
                        cropMargins={cropMargins}
                        setCropMargins={setCropMargins}
                        cropUnit={cropUnit}
                        setCropUnit={setCropUnit}
                        redactBoxes={redactBoxes}
                        setRedactBoxes={setRedactBoxes}
                        signature={signature}
                        setSignature={setSignature}
                        textAnnotations={textAnnotations}
                        setTextAnnotations={setTextAnnotations}
                        scanPages={scanPages}
                        setScanPages={setScanPages}
                        scanEnhance={scanEnhance}
                        setScanEnhance={setScanEnhance}
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
                    />

                    <ProcessingStatus
                        isProcessing={isProcessing}
                        statusMessage={statusMessage}
                        errorMessage={errorMessage}
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
