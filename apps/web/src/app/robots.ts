import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site-config';

/**
 * Served at /robots.txt. Sign-in, account and API routes are excluded: they
 * carry no search value and can surface session parameters in the index.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/sign-in', '/sign-up', '/login', '/dashboard', '/test'],
            },
        ],
        sitemap: absoluteUrl('/sitemap.xml'),
        host: absoluteUrl('/').replace(/\/$/, ''),
    };
}
