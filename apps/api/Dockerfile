### -------------------------
### 1. Builder Stage
### -------------------------
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Remove dev dependencies (keep only production deps)
RUN npm prune --omit=dev


### -------------------------
### 2. Runtime Stage
### -------------------------
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy pruned production node_modules
COPY --from=builder /app/node_modules ./node_modules

# Copy package.json (needed for Nest runtime)
COPY --from=builder /app/package*.json ./

# Copy compiled build
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
