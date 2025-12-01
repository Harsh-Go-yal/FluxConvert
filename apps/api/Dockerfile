# --- Stage 1: Install deps with Turborepo caching ---
FROM node:20-alpine AS deps
WORKDIR /app

# Install all workspace deps
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages ./packages

RUN npm install

# Copy the full monorepo
COPY . .

# Build only the API
RUN npx turbo run build --filter=api


# --- Stage 2: Production server image ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy only the API build output
COPY --from=deps /app/apps/api/dist ./dist

# Copy only production dependencies (Turbo already optimized them)
COPY --from=deps /app/node_modules ./node_modules

# Copy API package.json
COPY --from=deps /app/apps/api/package.json ./package.json

EXPOSE 4000
CMD ["node", "dist/main.js"]
