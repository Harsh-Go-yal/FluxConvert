import type { Metadata } from 'next';
import Link from 'next/link';
import { tools } from '@/config/tools';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
    title: 'About',
    description:
        'Why PDF Solutions processes your files in the browser instead of on a server, and what that means for your privacy, speed and costs.',
    alternates: { canonical: '/about' },
};

export default function AboutPage() {
    const liveTools = tools.filter((tool) => !tool.comingSoon).length;

    return (
        <main className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto px-4 py-16 max-w-3xl">
                <h1 className="text-4xl font-extrabold tracking-tight mb-6">About {siteConfig.name}</h1>

                <div className="space-y-8 text-muted-foreground leading-relaxed">
                    <p className="text-lg">
                        {siteConfig.name} is a set of {liveTools} file tools that run entirely inside your web
                        browser. There is no upload, no queue and no account.
                    </p>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Why the browser?</h2>
                        <p>
                            Most online PDF tools work by taking a copy of your document. You hand a contract, a
                            payslip or a medical form to a stranger&apos;s server and hope their retention policy is
                            honest. Modern browsers no longer make that necessary: WebAssembly can do the same PDF
                            work on your own machine, at your own speed.
                        </p>
                        <p className="mt-3">
                            So that is how this site is built. Your file is read into the page, processed there, and
                            handed back as a download. Nothing crosses the network — which also means no upload wait,
                            no file size cap imposed by a server, and nothing for us to lose in a breach.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Where we are honest about limits</h2>
                        <p>
                            Two tools are exceptions: adding and removing PDF passwords needs encryption a browser
                            cannot perform, so those files are sent to our service over HTTPS and discarded straight
                            after. Each of those pages says so in plain language rather than burying it.
                        </p>
                        <p className="mt-3">
                            Elsewhere we try to describe what a tool really does. Our archival export is a flattened,
                            self-contained PDF, not a certified PDF/A file. Signing places a visible signature, not a
                            cryptographic one. Saying so costs us a keyword or two and saves you a bad surprise.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-2">How it stays free</h2>
                        <p>
                            Because your device does the work, running this site costs a fraction of what a
                            server-side converter costs. That is what makes free, unlimited and watermark-free
                            possible.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Contact</h2>
                        <p>
                            Found a file that does not convert properly? Tell us at{' '}
                            <a
                                href={`mailto:${siteConfig.contactEmail}`}
                                className="text-primary underline underline-offset-4"
                            >
                                {siteConfig.contactEmail}
                            </a>
                            . Real broken files are the most useful bug reports we get.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-border/50 flex gap-6">
                    <Link href="/" className="text-primary underline underline-offset-4">
                        All tools
                    </Link>
                    <Link href="/privacy" className="text-primary underline underline-offset-4">
                        Privacy
                    </Link>
                    <Link href="/terms" className="text-primary underline underline-offset-4">
                        Terms
                    </Link>
                </div>
            </div>
        </main>
    );
}
