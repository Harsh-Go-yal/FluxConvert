import { tools } from "@/config/tools";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import ClientFileUploader from "@/components/client-file-uploader";
import { getToolContent } from "@/content/tool-content";
import { ToolJsonLd } from "@/components/seo/structured-data";
import { absoluteUrl, siteConfig } from "@/lib/site-config";

interface Props {
    params: Promise<{ tool: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { tool: toolId } = await params;
    const tool = tools.find((t) => t.href === `/${toolId}`);

    if (!tool) {
        return {
            title: "Tool Not Found - PDF Solutions",
        };
    }

    const content = getToolContent(tool.id, tool.title, tool.description);

    return {
        title: content.metaTitle,
        description: content.metaDescription,
        keywords: [tool.title.toLowerCase(), ...(content.keywords ?? [])],
        // A canonical URL per tool stops the 31 tool pages from being read as
        // variations of one another.
        alternates: { canonical: tool.href },
        openGraph: {
            type: 'website',
            url: absoluteUrl(tool.href),
            title: content.metaTitle,
            description: content.metaDescription,
            siteName: siteConfig.name,
        },
        twitter: {
            card: 'summary_large_image',
            title: content.metaTitle,
            description: content.metaDescription,
        },
    };
}

export async function generateStaticParams() {
    return tools.map((tool) => ({
        tool: tool.href.substring(1), // Remove leading slash
    }));
}

export default async function ToolPage({ params }: Props) {
    const { tool: toolId } = await params;
    const tool = tools.find((t) => t.href === `/${toolId}`);

    if (!tool) {
        notFound();
    }

    const content = getToolContent(tool.id, tool.title, tool.description);
    const relatedTools = content.related
        .map((id) => tools.find((candidate) => candidate.id === id))
        .filter((candidate): candidate is (typeof tools)[number] => Boolean(candidate) && candidate!.id !== tool.id)
        .slice(0, 4);

    return (
        <main className="min-h-screen bg-background text-foreground overflow-hidden relative selection:bg-primary/20">
            <ToolJsonLd
                name={tool.title}
                description={content.metaDescription}
                href={tool.href}
                category={tool.category}
                steps={content.steps}
                faqs={content.faqs}
            />
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-110%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-110%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            <div className="container mx-auto px-4 py-12 md:py-20">
                {/* Hero Section */}
                <div className="max-w-4xl mx-auto text-center mb-12">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-8 ${tool.color} bg-current/10 shadow-2xl shadow-current/20 ring-1 ring-current/20`}>
                        <tool.icon className="w-10 h-10" />
                    </div>
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                        {tool.title}
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        {tool.description}
                    </p>
                </div>

                {/* Uploader Section */}
                <div className="max-w-4xl mx-auto mb-24 relative z-10">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-3xl blur-3xl -z-10 opacity-50" />
                    <div className="glass rounded-3xl p-2 md:p-6 shadow-2xl shadow-black/5 border border-white/10 dark:border-white/5 bg-card/50 backdrop-blur-xl">
                        {tool.comingSoon ? (
                            <div className="p-8 md:p-12 text-center space-y-5">
                                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                                    Coming soon
                                </span>
                                <h2 className="text-2xl font-bold">{tool.title} is still being built</h2>
                                <p className="text-muted-foreground max-w-xl mx-auto">
                                    This one needs a dedicated editor, so we would rather ship it properly than
                                    hand you a page that quietly does nothing. In the meantime, these work today:
                                </p>
                                <div className="flex flex-wrap justify-center gap-3 pt-2">
                                    {tools
                                        .filter((t) => !t.comingSoon && t.category === tool.category && t.id !== tool.id)
                                        .slice(0, 4)
                                        .map((t) => (
                                            <Link key={t.id} href={t.href}>
                                                <Button variant="outline" className="rounded-xl">
                                                    <t.icon className={`w-4 h-4 mr-2 ${t.color}`} />
                                                    {t.title}
                                                </Button>
                                            </Link>
                                        ))}
                                </div>
                            </div>
                        ) : (
                            <ClientFileUploader initialAction={tool.id} />
                        )}
                    </div>
                </div>

                {/* How to Use — steps written for this specific tool */}
                <section className="max-w-5xl mx-auto mb-20" aria-labelledby="how-to">
                    <h2 id="how-to" className="text-3xl font-bold text-center mb-4">
                        How to {tool.title.toLowerCase()}
                    </h2>
                    <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12">{content.intro}</p>
                    <ol className="grid md:grid-cols-3 gap-8 list-none p-0">
                        {content.steps.map((step, index) => (
                            <li
                                key={step.title}
                                id={`step-${index + 1}`}
                                className="flex flex-col items-center text-center p-6 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 text-xl font-bold">
                                    {index + 1}
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                                <p className="text-muted-foreground">{step.detail}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                {/* FAQ — also feeds the FAQPage structured data */}
                {content.faqs.length > 0 && (
                    <section className="max-w-3xl mx-auto mb-20" aria-labelledby="faq">
                        <h2 id="faq" className="text-3xl font-bold text-center mb-10">
                            Frequently asked questions
                        </h2>
                        <div className="space-y-4">
                            {content.faqs.map((faq) => (
                                <details
                                    key={faq.question}
                                    className="group rounded-2xl border border-border/50 bg-card/50 p-5 open:border-primary/30"
                                >
                                    <summary className="cursor-pointer list-none font-semibold flex items-center justify-between gap-4">
                                        {faq.question}
                                        <span className="text-primary transition-transform group-open:rotate-45 text-xl leading-none">
                                            +
                                        </span>
                                    </summary>
                                    <p className="mt-3 text-muted-foreground leading-relaxed">{faq.answer}</p>
                                </details>
                            ))}
                        </div>
                    </section>
                )}

                {/* Why this site — honest, specific claims */}
                <section className="max-w-4xl mx-auto mb-20">
                    <div className="grid md:grid-cols-2 gap-10 text-left">
                        <div className="space-y-3">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-green-500">✓</span> Your files stay on your device
                            </h3>
                            <p className="text-muted-foreground">
                                This tool runs in your browser with WebAssembly. Nothing is uploaded, so nothing can
                                be stored, scanned or leaked. Password protection is the one exception, and its page
                                says so plainly.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-blue-500">✓</span> No sign-up, no watermark
                            </h3>
                            <p className="text-muted-foreground">
                                No account, no email, no trial that stamps a logo across your document or caps you at
                                three files a day.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-purple-500">✓</span> Fast, because there is no upload
                            </h3>
                            <p className="text-muted-foreground">
                                Work starts the moment you choose a file. There is no queue, and a large document is
                                limited by your own device rather than someone else&apos;s server.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-orange-500">✓</span> Works everywhere
                            </h3>
                            <p className="text-muted-foreground">
                                Windows, macOS, Linux, Android and iOS — anything with a modern browser. Nothing to
                                install.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Related tools — internal links that help people and crawlers */}
                {relatedTools.length > 0 && (
                    <section className="max-w-5xl mx-auto" aria-labelledby="related">
                        <h2 id="related" className="text-2xl font-bold text-center mb-8">
                            Related tools
                        </h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {relatedTools.map((related) => (
                                <Link
                                    key={related.id}
                                    href={related.href}
                                    className="flex items-start gap-3 p-4 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/40 transition-colors"
                                >
                                    <related.icon className={`w-5 h-5 mt-0.5 shrink-0 ${related.color}`} />
                                    <span>
                                        <span className="block font-semibold">{related.title}</span>
                                        <span className="block text-sm text-muted-foreground line-clamp-2">
                                            {related.description}
                                        </span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
