import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description:
        'What PDF Solutions does and does not collect. Almost every tool runs entirely in your browser, so your files are never uploaded in the first place.',
    alternates: { canonical: '/privacy' },
};

const UPDATED = 'September 2026';

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto px-4 py-16 max-w-3xl">
                <h1 className="text-4xl font-extrabold tracking-tight mb-3">Privacy Policy</h1>
                <p className="text-muted-foreground mb-10">Last updated: {UPDATED}</p>

                <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
                    <section className="rounded-2xl border border-primary/25 bg-primary/5 p-6">
                        <h2 className="text-xl font-bold mt-0 mb-2">The short version</h2>
                        <p className="mb-0 text-muted-foreground">
                            Almost every tool on this site processes your file inside your own browser. Your documents
                            are not uploaded, not stored and not seen by us — there is no copy on a server to leak,
                            because no copy is ever made. The two exceptions are named below.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold">Your files</h2>
                        <p className="text-muted-foreground">
                            Tools such as merge, split, compress, convert, rotate, crop, sign, redact and every image
                            tool run with WebAssembly and JavaScript on your device. The file you choose is read into
                            your browser&apos;s memory, processed there, and handed back to you as a download. It never
                            travels across the network.
                        </p>
                        <p className="text-muted-foreground">
                            <strong className="text-foreground">The exceptions are Protect PDF and Unlock PDF.</strong>{' '}
                            PDF encryption cannot be performed in a browser, so for those two tools the file and the
                            password you type are sent over an encrypted (HTTPS) connection to our processing service,
                            used to produce the result, returned to you, and then discarded. They are not retained
                            after the request completes. Each of those pages states this on the page itself.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold">Accounts</h2>
                        <p className="text-muted-foreground">
                            You do not need an account to use any tool. If you choose to create one, authentication is
                            handled by Clerk, which stores your email address and sign-in credentials on our behalf.
                            You can delete your account at any time.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold">Analytics and cookies</h2>
                        <p className="text-muted-foreground">
                            We look at aggregate traffic figures — page views, rough geography, which tools get used —
                            to decide what to build next. This never includes the contents of your files, because that
                            data does not exist outside your browser. Cookies are used to keep you signed in if you
                            created an account and to remember your light or dark theme preference.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold">What we never do</h2>
                        <ul className="text-muted-foreground space-y-1">
                            <li>We do not sell or share your personal data.</li>
                            <li>We do not read, index or train anything on your documents.</li>
                            <li>We do not require an email address to use a tool.</li>
                            <li>We do not add watermarks or hidden identifiers to your output files.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold">Your rights</h2>
                        <p className="text-muted-foreground">
                            If you have an account, you can request a copy of the data associated with it, ask for it
                            to be corrected, or ask for it to be deleted. Because your files are never collected,
                            there is nothing else for us to hand over or erase.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold">Contact</h2>
                        <p className="text-muted-foreground">
                            Questions about this policy can go to{' '}
                            <a href={`mailto:${siteConfig.contactEmail}`} className="text-primary underline underline-offset-4">
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
