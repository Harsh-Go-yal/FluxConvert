import { MergeConfig } from "./configs/merge-config";
import { SplitConfig } from "./configs/split-config";
import { SecurityConfig } from "./configs/security-config";
import { WatermarkConfig } from "./configs/watermark-config";
import { RemovePagesConfig } from "./configs/remove-pages-config";

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
}

export function ActionConfig({
    action, files, setFiles, password, setPassword, watermarkText, setWatermarkText,
    startPage, setStartPage, endPage, setEndPage, pagesToRemove, setPagesToRemove,
    thumbnails, generatingThumbnails
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
        default:
            return null;
    }
}
