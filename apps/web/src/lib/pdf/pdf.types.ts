export type PdfAction =
    | 'merge'
    | 'split'
    | 'remove_pages'
    | 'rotate'
    | 'watermark'

    | 'compress'
    | 'pdf_to_images'
    | 'image_to_pdf'
    | 'get_thumbnails'
    | 'protect'
    | 'unlock';

export interface PdfWorkerRequest {
    id: string;
    action: PdfAction;
    payload: any;
}

export interface PdfWorkerResponse {
    id: string;
    success: boolean;
    data?: any;
    error?: string;
}

export type ProcessingMode = 'auto' | 'local' | 'cloud';

export interface PdfProcessingOptions {
    mode?: ProcessingMode;
}
