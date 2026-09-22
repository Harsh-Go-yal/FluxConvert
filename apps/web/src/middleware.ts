import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAuthConfigured } from "@/lib/auth-config";

const isProtectedRoute = createRouteMatcher([
    '/dashboard(.*)',
    '/tools(.*)',
]);

// Without Clerk keys the middleware throws on every request ("Missing secretKey"),
// which turns the entire site into a 500. Fall through instead.
const passthrough = () => NextResponse.next();

export default isAuthConfigured
    ? clerkMiddleware(async (auth, req) => {
          if (isProtectedRoute(req)) await auth.protect();
      })
    : passthrough;

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
