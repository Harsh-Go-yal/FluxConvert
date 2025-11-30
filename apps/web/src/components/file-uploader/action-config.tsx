import { MergeConfig } from "./configs/merge-config";
import { SplitConfig } from "./configs/split-config";
import { SecurityConfig } from "./configs/security-config";
import { WatermarkConfig } from "./configs/watermark-config";
import { RemovePagesConfig } from "./configs/remove-pages-config";
import { CompressConfig } from "./configs/compress-config";
import { ResizeConfig } from "./configs/resize-config";

interface ActionConfigProps {
    action: string;
    files: File[];
    setFiles: (files: File[]) => void;
    password: string;
    setPassword: (val: string) => void;
    watermarkText: string;
    setWatermarkText: (val: string) => void;
    startPage: number;
    setStartPage: (val: number) => void;
    endPage: number;
    setEndPage: (val: number) => void;
    pagesToRemove: string;
    setPagesToRemove: (val: string) => void;
    thumbnails: string[];
    generatingThumbnails: boolean;
    compressionMode: "percentage" | "target";
    setCompressionMode: (val: "percentage" | "target") => void;
    compressionPercentage: number;
    setCompressionPercentage: (val: number) => void;
    targetSize: number;
    setTargetSize: (val: number) => void;
    targetUnit: "KB" | "MB";
    setTargetUnit: (val: "KB" | "MB") => void;
    // Resize Props
    resizeWidth: number;
    setResizeWidth: (val: number) => void;
    resizeHeight: number;
    setResizeHeight: (val: number) => void;
    resizeUnit: "pixels" | "percentage";
    setResizeUnit: (val: "pixels" | "percentage") => void;
    maintainAspectRatio: boolean;
    setMaintainAspectRatio: (val: boolean) => void;
    resizeMode: "stretch" | "crop" | "fit";
    setResizeMode: (val: "stretch" | "crop" | "fit") => void;
    resizeDpi: number;
    setResizeDpi: (val: number) => void;
    resizeFormat: "jpg" | "png" | "webp";
    setResizeFormat: (val: "jpg" | "png" | "webp") => void;
    resizeQuality: number;
    setResizeQuality: (val: number) => void;
    resizeBackground: string;
    setResizeBackground: (val: string) => void;
    originalDimensions: { width: number; height: number } | null;
}

export function ActionConfig({
    action, files, setFiles, password, setPassword, watermarkText, setWatermarkText,
    startPage, setStartPage, endPage, setEndPage, pagesToRemove, setPagesToRemove,
    thumbnails, generatingThumbnails,
    compressionMode, setCompressionMode, compressionPercentage, setCompressionPercentage,
    targetSize, setTargetSize, targetUnit, setTargetUnit,
    resizeWidth, setResizeWidth, resizeHeight, setResizeHeight, resizeUnit, setResizeUnit,
    maintainAspectRatio, setMaintainAspectRatio, resizeMode, setResizeMode,
    resizeDpi, setResizeDpi, resizeFormat, setResizeFormat, resizeQuality, setResizeQuality,
    resizeBackground, setResizeBackground, originalDimensions
}: ActionConfigProps) {

    switch (action) {
        case "merge-pdf":
            return <MergeConfig files={files} setFiles={setFiles} />;
        case "split-pdf":
            return <SplitConfig startPage={startPage} setStartPage={setStartPage} endPage={endPage} setEndPage={setEndPage} />;
        case "protect-pdf":
        case "unlock-pdf":
            return <SecurityConfig action={action} password={password} setPassword={setPassword} />;
        case "watermark-pdf":
            return <WatermarkConfig watermarkText={watermarkText} setWatermarkText={setWatermarkText} />;
        case "remove-pages":
            return <RemovePagesConfig
                pagesToRemove={pagesToRemove}
                setPagesToRemove={setPagesToRemove}
                thumbnails={thumbnails}
                generatingThumbnails={generatingThumbnails}
            />;
        case "compress-image":
            return <CompressConfig
                files={files}
                compressionMode={compressionMode}
                setCompressionMode={setCompressionMode}
                compressionPercentage={compressionPercentage}
                setCompressionPercentage={setCompressionPercentage}
                targetSize={targetSize}
                setTargetSize={setTargetSize}
                targetUnit={targetUnit}
                setTargetUnit={setTargetUnit}
            />;
        case "resize-image":
            return <ResizeConfig
                width={resizeWidth}
                setWidth={setResizeWidth}
                height={resizeHeight}
                setHeight={setResizeHeight}
                unit={resizeUnit}
                setUnit={setResizeUnit}
                maintainAspectRatio={maintainAspectRatio}
                setMaintainAspectRatio={setMaintainAspectRatio}
                resizeMode={resizeMode}
                setResizeMode={setResizeMode}
                dpi={resizeDpi}
                setDpi={setResizeDpi}
                format={resizeFormat}
                setFormat={setResizeFormat}
                quality={resizeQuality}
                setQuality={setResizeQuality}
                background={resizeBackground}
                setBackground={setResizeBackground}
                originalWidth={originalDimensions?.width}
                originalHeight={originalDimensions?.height}
            />;
        default:
            return null;
    }
}
