import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { isAuthConfigured } from "@/lib/auth-config";

export default function Page() {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-muted/20">
            {isAuthConfigured ? (
                <SignUp />
            ) : (
                // Accounts are optional: every file tool works without one.
                <div className="max-w-md text-center space-y-4 p-8">
                    <h1 className="text-2xl font-bold">Accounts are not enabled</h1>
                    <p className="text-muted-foreground">
                        Sign up is unavailable on this deployment, but every tool works without an
                        account — your files are processed in your own browser.
                    </p>
                    <Link href="/" className="inline-block text-primary underline underline-offset-4">
                        Back to the tools
                    </Link>
                </div>
            )}
        </div>
    );
}
