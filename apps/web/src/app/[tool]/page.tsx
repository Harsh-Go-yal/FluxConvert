import { tools } from "@/config/tools";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import ClientFileUploader from "@/components/client-file-uploader";

interface Props {
    params: Promise<{ tool: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { tool: toolId } = await params;
    const tool = tools.find((t) => t.href === `/${toolId}`);

    if (!tool) {
        return {
            title: "Tool Not Found - FluxConvert",
        };
    }

    return {
        title: `${tool.title} - FluxConvert`,
        description: tool.description,
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

    return (
        <main className="min-h-screen bg-background text-foreground overflow-hidden relative selection:bg-primary/20">
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
                        <ClientFileUploader initialAction={tool.id} />
                    </div>
                </div>

                {/* How to Use Section */}
                <div className="max-w-5xl mx-auto mb-24">
                    <h2 className="text-3xl font-bold text-center mb-12">How to {tool.title}</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 text-xl font-bold">1</div>
                            <h3 className="text-lg font-semibold mb-2">Upload your files</h3>
                            <p className="text-muted-foreground">Drag and drop your files into the box above or click to select them.</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 text-xl font-bold">2</div>
                            <h3 className="text-lg font-semibold mb-2">Process</h3>
                            <p className="text-muted-foreground">FluxConvert will automatically process your files with our advanced engine.</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 text-xl font-bold">3</div>
                            <h3 className="text-lg font-semibold mb-2">Download</h3>
                            <p className="text-muted-foreground">Get your converted files instantly. Secure, fast, and high quality.</p>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="max-w-4xl mx-auto text-center">
                    <div className="grid md:grid-cols-2 gap-12 text-left">
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-green-500">✓</span> Secure Processing
                            </h3>
                            <p className="text-muted-foreground">
                                Your files are processed locally whenever possible. When cloud processing is needed, files are deleted automatically after 1 hour.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-blue-500">✓</span> High Quality
                            </h3>
                            <p className="text-muted-foreground">
                                We use advanced algorithms to ensure the highest quality output for all your conversions and edits.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-purple-500">✓</span> Free & Easy
                            </h3>
                            <p className="text-muted-foreground">
                                FluxConvert is 100% free to use. No registration required, no hidden fees, just simple file tools.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-orange-500">✓</span> Cross Platform
                            </h3>
                            <p className="text-muted-foreground">
                                Works on Windows, Mac, Linux, and mobile devices. All you need is a modern web browser.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
