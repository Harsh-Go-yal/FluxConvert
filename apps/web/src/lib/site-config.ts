/**
 * Single source of truth for anything that appears in metadata, structured
 * data, the sitemap or share cards. Keeping it here stops the canonical host,
 * brand name and social handles from drifting apart across pages.
 */

/**
 * The canonical origin, without a trailing slash.
 *
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL for the production domain, but the
 * site is served from the www host (the apex 307-redirects there), so a wrong
 * value here would make every canonical tag point at a redirect.
 */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pdfsolutionss.com').replace(/\/$/, '');

export const siteConfig = {
    name: 'PDF Solutions',
    shortName: 'PDF Solutions',
    url: siteUrl,
    tagline: 'Free PDF and image tools that run in your browser',
    description:
        'Merge, split, compress, convert, sign and edit PDFs for free. Every tool runs inside your browser, so your files never leave your device. No sign-up, no upload, no watermarks.',
    locale: 'en_US',
    twitter: '@pdfsolutions',
    /** Used for the Organization and WebSite structured data. */
    founded: '2025',
    contactEmail: 'support@pdfsolutionss.com',
} as const;

export const absoluteUrl = (path = '/') => `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;

/** Open Graph image for pages that do not define their own. */
export const defaultOgImage = {
    url: absoluteUrl('/opengraph-image'),
    width: 1200,
    height: 630,
    alt: `${siteConfig.name} — ${siteConfig.tagline}`,
};
