import { mergePdfLocal, splitPdfLocal } from './pdfLocal';
import { mergePdfRemote, splitPdfRemote } from './pdfRemote';
import { ProcessingMode } from './pdf.types';

const MAX_LOCAL_SIZE_MB = 20;

function shouldRunLocally(files: File[], mode: ProcessingMode = 'auto'): boolean {
    if (mode === 'local') return true;
    if (mode === 'cloud') return false;

    // Auto mode logic
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    const totalSizeMB = totalSize / (1024 * 1024);

    return totalSizeMB <= MAX_LOCAL_SIZE_MB;
}

export async function mergePdf(
    files: File[],
    options: { mode?: ProcessingMode } = {}
): Promise<Blob> {
    const useLocal = shouldRunLocally(files, options.mode);

    if (useLocal) {
        try {
            console.log('Using Local PDF Merge');
            return await mergePdfLocal(files);
        } catch (error) {
            console.warn('Local merge failed, falling back to cloud:', error);
            // Fallback to remote if local fails and mode was auto
            if (options.mode === 'local') throw error;
        }
    }

    console.log('Using Cloud PDF Merge');
    return await mergePdfRemote(files);
}

export async function splitPdf(
    file: File,
    ranges: string,
    options: { mode?: ProcessingMode } = {}
): Promise<Blob[]> {
    const useLocal = shouldRunLocally([file], options.mode);

    if (useLocal) {
        try {
            console.log('Using Local PDF Split');
            return await splitPdfLocal(file, ranges);
        } catch (error) {
            console.warn('Local split failed, falling back to cloud:', error);
            if (options.mode === 'local') throw error;
        }
    }

    console.log('Using Cloud PDF Split');
    return await splitPdfRemote(file, ranges);
}
