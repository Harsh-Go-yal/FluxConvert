import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const action = formData.get('action') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let pipeline = sharp(buffer);
        let outputFormat = 'jpeg'; // Default
        let mimeType = 'image/jpeg';

        // --- Actions ---
        if (action === 'to-png') {
            pipeline = pipeline.png();
            outputFormat = 'png';
            mimeType = 'image/png';
        } else if (action === 'to-jpg') {
            pipeline = pipeline.jpeg();
            outputFormat = 'jpg';
            mimeType = 'image/jpeg';
        } else if (action === 'to-webp') {
            pipeline = pipeline.webp();
            outputFormat = 'webp';
            mimeType = 'image/webp';
        } else if (action === 'grayscale') {
            pipeline = pipeline.grayscale();
        } else if (action === 'sepia') {
            // Sharp doesn't have a direct sepia, but we can simulate or just skip for now/use modulate
            pipeline = pipeline.modulate({ saturation: 0.5, brightness: 1.1 }); // Approx
        } else if (action === 'invert') {
            pipeline = pipeline.negate();
        } else if (action === 'blur') {
            pipeline = pipeline.blur(5);
        } else if (action === 'sharpen') {
            pipeline = pipeline.sharpen();
        } else if (action === 'brightness') {
            pipeline = pipeline.modulate({ brightness: 1.5 });
        } else if (action === 'contrast') {
            pipeline = pipeline.linear(1.5, -(128 * 1.5) + 128); // Approx contrast
        } else if (action === 'pixelate') {
            // Sharp doesn't have pixelate directly, maybe resize down then up
            const metadata = await pipeline.metadata();
            if (metadata.width) {
                pipeline = pipeline.resize(Math.round(metadata.width / 10), null, { kernel: 'nearest' })
                    .resize(metadata.width, null, { kernel: 'nearest' });
            }
        }

        const processedBuffer = await pipeline.toBuffer();

        return new NextResponse(processedBuffer as any, {
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="processed.${outputFormat}"`,
            },
        });

    } catch (error: any) {
        console.error('Image processing error:', error);
        return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
    }
}
