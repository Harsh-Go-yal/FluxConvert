# 1. Builder stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy only what we need
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/

# Install deps at root (Turbo monorepo)
RUN npm install

# Copy rest of monorepo
COPY . .

# Build only API
RUN npx turbo run build --filter=api

# 2. Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Railway will inject env automatically — DO NOT hardcode
# No ENV PDF_SERVICE_URL=... here

# Copy API compiled output
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose port consistent with NestJS
EXPOSE 3000

CMD ["node", "dist/main.js"]
