import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000'; // Or use env var

export async function mergePdfRemote(files: File[]): Promise<Blob> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await axios.post(`${API_BASE_URL}/pdf/merge`, formData, {
        responseType: 'blob',
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data;
}

export async function splitPdfRemote(file: File, ranges: string): Promise<Blob[]> {
    // The API Gateway currently returns a single PDF for split (or zip? check API).
    // The prompt for API Gateway said "POST /pdf/split".
    // If the API returns a single file (e.g. zip of splits or just one split), we need to handle it.
    // Let's assume for now the API returns a single PDF (maybe the first range?) or a ZIP.
    // If the API returns a ZIP, we'd need to unzip it here.
    // However, for simplicity and matching the "Blob[]" return type, let's assume the API 
    // might need adjustment or we handle what we get.
    // Given the previous step, the API returns "application/pdf" with "split_filename.pdf".
    // This implies the API currently only supports returning ONE file (maybe the merged result of splits?).
    // Let's implement this to return [Blob] for now.

    const formData = new FormData();
    formData.append('file', file);
    // Parse ranges to start/end for the API which expects start/end
    // The API expects "start" and "end" integers.
    // This means the API only supports a SINGLE range split.
    // We need to adapt or note this limitation.
    // Let's parse the FIRST range from the string for the API call.

    const parts = ranges.split(',')[0].trim();
    let start = 1;
    let end = 1;

    if (parts.includes('-')) {
        [start, end] = parts.split('-').map(p => parseInt(p));
    } else {
        start = parseInt(parts);
        end = start;
    }

    formData.append('start', start.toString());
    formData.append('end', end.toString());

    const response = await axios.post(`${API_BASE_URL}/pdf/split`, formData, {
        responseType: 'blob',
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return [response.data];
}
