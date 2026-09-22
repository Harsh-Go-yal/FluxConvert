import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/site-config';

/**
 * The card that appears when the site is shared on WhatsApp, Slack, X or
 * LinkedIn. Generated at build time rather than maintained as a design file,
 * so it never drifts from the tagline in site-config.
 */
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 36 }}>
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 18,
                            background: '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 38,
                        }}
                    >
                        ⚡
                    </div>
                    <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>{siteConfig.name}</div>
                </div>

                <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, letterSpacing: -2, maxWidth: 900 }}>
                    Free PDF tools that never upload your files
                </div>

                <div style={{ fontSize: 30, color: '#b9c6e4', marginTop: 28, maxWidth: 880, lineHeight: 1.4 }}>
                    Merge, split, compress, convert, sign and redact — all inside your browser. No sign-up, no
                    watermark.
                </div>

                <div style={{ display: 'flex', gap: 14, marginTop: 44 }}>
                    {['Private by design', 'No upload', 'Free forever'].map((label) => (
                        <div
                            key={label}
                            style={{
                                display: 'flex',
                                fontSize: 24,
                                padding: '10px 22px',
                                borderRadius: 999,
                                border: '1px solid rgba(255,255,255,0.25)',
                                color: '#dbe5ff',
                            }}
                        >
                            {label}
                        </div>
                    ))}
                </div>
            </div>
        ),
        size,
    );
}
