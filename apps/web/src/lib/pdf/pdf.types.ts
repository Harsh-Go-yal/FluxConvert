export type PdfAction =
    | 'MERGE'
    | 'SPLIT'
    | 'REMOVE_PAGES'
    | 'ROTATE'
    | 'WATERMARK'

    | 'COMPRESS'
    | 'PDF_TO_IMAGES'
    | 'IMAGE_TO_PDF'
    | 'GET_THUMBNAILS';

export interface PdfWorkerRequest {
    id: string;
    type: PdfAction;
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
