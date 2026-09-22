import { siteConfig, absoluteUrl } from '@/lib/site-config';
import type { ToolFaq } from '@/content/tool-content';

/**
 * JSON-LD helpers.
 *
 * Google reads these to build rich results — the FAQ accordions and breadcrumb
 * trails that take up more space in the listing than a plain blue link. The
 * markup must describe what is actually on the page, so every block here is
 * generated from the same content the page renders.
 */

function JsonLd({ data }: { data: Record<string, unknown> }) {
    return (
        <script
            type="application/ld+json"
            // The payload is built from our own content, not user input.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}

/** Site-wide identity, rendered once on the home page. */
export function OrganizationJsonLd() {
    return (
        <JsonLd
            data={{
                '@context': 'https://schema.org',
                '@graph': [
                    {
                        '@type': 'Organization',
                        '@id': absoluteUrl('/#organization'),
                        name: siteConfig.name,
                        url: siteConfig.url,
                        description: siteConfig.description,
                        foundingDate: siteConfig.founded,
                    },
                    {
                        '@type': 'WebSite',
                        '@id': absoluteUrl('/#website'),
                        url: siteConfig.url,
                        name: siteConfig.name,
                        description: siteConfig.description,
                        publisher: { '@id': absoluteUrl('/#organization') },
                        inLanguage: 'en',
                    },
                ],
            }}
        />
    );
}

export function ToolJsonLd({
    name,
    description,
    href,
    category,
    steps,
    faqs,
}: {
    name: string;
    description: string;
    href: string;
    category: string;
    steps: { title: string; detail: string }[];
    faqs: ToolFaq[];
}) {
    const url = absoluteUrl(href);

    return (
        <JsonLd
            data={{
                '@context': 'https://schema.org',
                '@graph': [
                    {
                        '@type': 'WebApplication',
                        '@id': `${url}#app`,
                        name,
                        url,
                        description,
                        applicationCategory: 'UtilitiesApplication',
                        operatingSystem: 'Any browser',
                        browserRequirements: 'Requires JavaScript',
                        // Free with no paid tier gates on these tools; stating a price
                        // is what makes the "Free" label eligible to appear.
                        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                        featureList: [category, 'Runs in your browser', 'No sign-up required'],
                        isPartOf: { '@id': absoluteUrl('/#website') },
                    },
                    {
                        '@type': 'HowTo',
                        '@id': `${url}#howto`,
                        name: `How to ${name.toLowerCase()}`,
                        description,
                        totalTime: 'PT1M',
                        tool: { '@type': 'HowToTool', name: 'A web browser' },
                        step: steps.map((step, index) => ({
                            '@type': 'HowToStep',
                            position: index + 1,
                            name: step.title,
                            text: step.detail,
                            url: `${url}#step-${index + 1}`,
                        })),
                    },
                    ...(faqs.length
                        ? [
                              {
                                  '@type': 'FAQPage',
                                  '@id': `${url}#faq`,
                                  mainEntity: faqs.map((faq) => ({
                                      '@type': 'Question',
                                      name: faq.question,
                                      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
                                  })),
                              },
                          ]
                        : []),
                    {
                        '@type': 'BreadcrumbList',
                        '@id': `${url}#breadcrumb`,
                        itemListElement: [
                            { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
                            { '@type': 'ListItem', position: 2, name: 'Tools', item: absoluteUrl('/tools') },
                            { '@type': 'ListItem', position: 3, name, item: url },
                        ],
                    },
                ],
            }}
        />
    );
}
