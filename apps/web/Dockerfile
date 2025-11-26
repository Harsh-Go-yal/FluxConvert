###############################################
# 1. Builder
###############################################
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Build Next.js standalone output
RUN npm run build

###############################################
# 2. Runner
###############################################
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy next config (optional)
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

# Start standalone server
CMD ["node", "server.js"]
