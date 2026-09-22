import type { MetadataRoute } from 'next';
import { tools } from '@/config/tools';
import { absoluteUrl } from '@/lib/site-config';

/**
 * Served at /sitemap.xml, generated from the tool registry so a new tool is
 * discoverable the moment it ships. Tools still marked "coming soon" are left
 * out — indexing a page that cannot do its job wastes crawl budget and earns
 * a bad first impression.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();

    const staticPages: MetadataRoute.Sitemap = [
        { url: absoluteUrl('/'), lastModified, changeFrequency: 'weekly', priority: 1 },
        { url: absoluteUrl('/tools'), lastModified, changeFrequency: 'weekly', priority: 0.9 },
        { url: absoluteUrl('/pricing'), lastModified, changeFrequency: 'monthly', priority: 0.5 },
        { url: absoluteUrl('/privacy'), lastModified, changeFrequency: 'yearly', priority: 0.3 },
        { url: absoluteUrl('/terms'), lastModified, changeFrequency: 'yearly', priority: 0.3 },
        { url: absoluteUrl('/about'), lastModified, changeFrequency: 'yearly', priority: 0.4 },
    ];

    const toolPages: MetadataRoute.Sitemap = tools
        .filter((tool) => !tool.comingSoon)
        .map((tool) => ({
            url: absoluteUrl(tool.href),
            lastModified,
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        }));

    return [...staticPages, ...toolPages];
}
