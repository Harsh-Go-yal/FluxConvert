/**
 * Whether Clerk is configured for this deployment.
 *
 * Without a publishable key, Clerk's components throw during prerendering and
 * take the whole `next build` down — which is how a single missing environment
 * variable used to break production deploys. The app now degrades gracefully:
 * auth UI is hidden and protected routes stay open, but the build and every
 * file tool keep working.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so this is a constant in the
 * client bundle.
 */
export const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export const isAuthConfigured = clerkPublishableKey.length > 0;
