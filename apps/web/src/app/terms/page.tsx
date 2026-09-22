import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description:
        'The terms for using PDF Solutions: free browser-based file tools, offered as-is, with you keeping full ownership of your documents.',
    alternates: { canonical: '/terms' },
};

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto px-4 py-16 max-w-3xl">
                <h1 className="text-4xl font-extrabold tracking-tight mb-3">Terms of Service</h1>
                <p className="text-muted-foreground mb-10">Last updated: September 2026</p>

                <div className="space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold mb-2">Using the tools</h2>
                        <p className="text-muted-foreground">
                            {siteConfig.name} is free to use and needs no account. You may use it for personal or
                            commercial work. You may not use it to process material you have no right to process, or
                            to attempt to break, overload or resell the service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-2">Your files stay yours</h2>
                        <p className="text-muted-foreground">
                            We claim no ownership over anything you process here, and no licence over it. Since almost
                            every tool runs inside your browser, we never receive your documents at all. See the{' '}
                            <Link href="/privacy" className="text-primary underline underline-offset-4">
                                privacy policy
                            </Link>{' '}
                            for the two exceptions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-2">No warranty</h2>
                        <p className="text-muted-foreground">
                            The tools are provided as-is. We work hard to keep them correct — every tool is tested in
                            a real browser before release — but we cannot guarantee a particular result for every
                            possible file. Keep a copy of anything important before you process it, and check the
                            output before you rely on it.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-2">Limits of liability</h2>
                        <p className="text-muted-foreground">
                            To the extent permitted by law, we are not liable for loss of data, profit or business
                            arising from use of the site. If some part of these terms is unenforceable where you live,
                            the rest still applies.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-2">Changes</h2>
                        <p className="text-muted-foreground">
                            These terms may change as the service grows. The date above always reflects the current
                            version. Questions go to{' '}
                            <a
                                href={`mailto:${siteConfig.contactEmail}`}
                                className="text-primary underline underline-offset-4"
                            >
                                {siteConfig.contactEmail}
                            </a>
                            .
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-border/50">
                    <Link href="/" className="text-primary underline underline-offset-4">
                        Back to the tools
                    </Link>
                </div>
            </div>
        </main>
    );
}
