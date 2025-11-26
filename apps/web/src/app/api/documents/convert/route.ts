import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const action = formData.get('action') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        if (action === 'to-html') {
            const result = await mammoth.convertToHtml({ buffer });
            return new NextResponse(result.value, {
                headers: {
                    'Content-Type': 'text/html',
                    'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^/.]+$/, "")}.html"`
                }
            });
        } else if (action === 'to-text') {
            const result = await mammoth.extractRawText({ buffer });
            return new NextResponse(result.value, {
                headers: {
                    'Content-Type': 'text/plain',
                    'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^/.]+$/, "")}.txt"`
                }
            });
        } else if (action === 'to-csv') {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^/.]+$/, "")}.csv"`
                }
            });
        } else if (action === 'to-pdf' && file.name.endsWith('.xlsx')) {
            // Basic XLSX to PDF via HTML (not perfect but better than nothing without LibreOffice)
            // Actually, for now let's return error or implement basic HTML table -> PDF if needed.
            // But the user asked for "Heavy Ops". 
            // Let's stick to CSV for now as it's reliable with SheetJS.
            return NextResponse.json({ error: 'Server-side Excel to PDF not fully implemented without LibreOffice. Use Local mode.' }, { status: 501 });
        }

        return NextResponse.json({ error: 'Invalid action or file type' }, { status: 400 });

    } catch (error: any) {
        console.error('Document conversion error:', error);
        return NextResponse.json({ error: error.message || 'Conversion failed' }, { status: 500 });
    }
}
