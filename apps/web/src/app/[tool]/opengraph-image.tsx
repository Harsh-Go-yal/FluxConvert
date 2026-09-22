import { ImageResponse } from 'next/og';
import { tools } from '@/config/tools';
import { getToolContent } from '@/content/tool-content';
import { siteConfig } from '@/lib/site-config';

/**
 * A share card per tool, so a link to "Merge PDF" in a chat shows that tool's
 * name and promise rather than a generic site banner.
 */
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export async function generateStaticParams() {
    return tools.map((tool) => ({ tool: tool.href.substring(1) }));
}

export default async function ToolOpengraphImage({ params }: { params: Promise<{ tool: string }> }) {
    const { tool: slug } = await params;
    const tool = tools.find((candidate) => candidate.href === `/${slug}`);
    const title = tool?.title ?? siteConfig.name;
    const description = tool
        ? getToolContent(tool.id, tool.title, tool.description).metaDescription
        : siteConfig.description;

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '80px',
                    background: 'linear-gradient(135deg, #0b1020 0%, #14213d 55%, #1f3a8a 100%)',
                    color: '#ffffff',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ fontSize: 28, color: '#93b0ff', fontWeight: 600, marginBottom: 22 }}>
                    {siteConfig.name}
                </div>
                <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div>
                <div style={{ fontSize: 30, color: '#b9c6e4', marginTop: 26, maxWidth: 940, lineHeight: 1.4 }}>
                    {description.slice(0, 150)}
                </div>
                <div
                    style={{
                        display: 'flex',
                        fontSize: 24,
                        marginTop: 44,
                        padding: '10px 22px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.25)',
                        color: '#dbe5ff',
                        alignSelf: 'flex-start',
                    }}
                >
                    Runs in your browser · No upload · Free
                </div>
            </div>
        ),
        size,
    );
}
