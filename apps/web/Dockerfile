FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS builder
WORKDIR /app
COPY . .
RUN npm install -g turbo
RUN turbo prune --scope=web --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm install

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
# Add dummy environment variables for build time (Next.js inlines these)
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder
ENV CLERK_SECRET_KEY=sk_test_placeholder
ENV NEXT_PUBLIC_API_URL=http://localhost:3001

RUN npm run build --filter=web...

FROM base AS runner
WORKDIR /app
COPY --from=installer /app/apps/web/next.config.ts .
COPY --from=installer /app/apps/web/package.json .
COPY --from=installer /app/apps/web/.next/standalone ./
COPY --from=installer /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer /app/apps/web/public ./apps/web/public

CMD node apps/web/server.js
