# Stage 1: Build WASM
FROM rust:1.83-slim-bookworm as wasm-builder
WORKDIR /app
RUN apt-get update && apt-get install -y curl
# Install wasm-pack
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
COPY packages/wasm ./packages/wasm
WORKDIR /app/packages/wasm
RUN wasm-pack build --target web --release --out-dir pkg

FROM node:20-alpine AS builder
WORKDIR /app
# Copy the entire monorepo
COPY . .
# Copy pre-built WASM
COPY --from=wasm-builder /app/packages/wasm/pkg ./packages/wasm/pkg
# Install dependencies for the whole monorepo
RUN apk add --no-cache dos2unix
RUN dos2unix packages/wasm/build.sh && chmod +x packages/wasm/build.sh
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
COPY --from=wasm-builder /app/packages/wasm/pkg ./packages/wasm/pkg

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
