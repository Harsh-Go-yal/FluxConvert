export const MAX_LOCAL_SIZE_MB = 25;
export const MAX_LOCAL_SIZE_BYTES = MAX_LOCAL_SIZE_MB * 1024 * 1024;

export enum ProcessingMode {
    LOCAL = "LOCAL",
    CLOUD = "CLOUD",
}

export const determineProcessingMode = (file: File): ProcessingMode => {
    if (file.size > MAX_LOCAL_SIZE_BYTES) {
        return ProcessingMode.CLOUD;
    }
    // Add more logic here (e.g., device capabilities, specific file types)
    return ProcessingMode.LOCAL;
};

export const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};
