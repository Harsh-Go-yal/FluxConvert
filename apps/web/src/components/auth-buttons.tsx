"use client";

import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/**
 * The header's auth island.
 *
 * Clerk's SDK is around 245 KB and every visitor downloaded it on every page,
 * even though no tool on this site needs an account. Mounting the provider
 * here instead of in the root layout keeps it off the critical render path:
 * the page paints first, then this island hydrates and loads Clerk.
 *
 * ClerkProvider only has to wrap the components that use Clerk hooks, so a
 * provider around this subtree is enough.
 */
export default function AuthButtons({ mobile = false }: { mobile?: boolean }) {
    if (mobile) {
        return (
            <ClerkProvider afterSignOutUrl="/">
                <SignedOut>
                    <SignInButton mode="modal">
                        <Button className="w-full">Log in</Button>
                    </SignInButton>
                </SignedOut>
            </ClerkProvider>
        );
    }

    return (
        <ClerkProvider afterSignOutUrl="/">
            <div className="flex items-center gap-2">
                <SignedOut>
                    <SignInButton mode="modal">
                        <Button variant="ghost" size="sm">
                            Log in
                        </Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                        <Button size="sm">Sign up</Button>
                    </SignUpButton>
                </SignedOut>
                <SignedIn>
                    <UserButton />
                </SignedIn>
            </div>
        </ClerkProvider>
    );
}
