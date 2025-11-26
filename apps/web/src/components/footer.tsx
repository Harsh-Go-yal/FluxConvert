import Link from "next/link";
import { Github, Twitter } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t bg-muted/30">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                            FluxConvert
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Professional file conversion tools for everyone. Fast, secure, and free.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Tools</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/tools/pdf" className="hover:text-primary transition-colors">PDF Tools</Link></li>
                            <li><Link href="/tools/image" className="hover:text-primary transition-colors">Image Tools</Link></li>
                            <li><Link href="/tools/indian" className="hover:text-primary transition-colors">Indian Tools</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Company</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                            <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Connect</h4>
                        <div className="flex space-x-4">
                            <Link href="https://github.com" className="text-muted-foreground hover:text-primary transition-colors">
                                <Github className="w-5 h-5" />
                            </Link>
                            <Link href="https://twitter.com" className="text-muted-foreground hover:text-primary transition-colors">
                                <Twitter className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} FluxConvert. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
