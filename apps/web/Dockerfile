FROM node:20-alpine AS builder
WORKDIR /app
# Copy the entire monorepo
COPY . .
# Install dependencies for the whole monorepo
RUN npm install
# Build the web app using turbo
RUN npx turbo run build --filter=web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy standalone build
# The standalone build is located at apps/web/.next/standalone
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
