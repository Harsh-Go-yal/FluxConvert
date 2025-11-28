FROM node:20-alpine AS builder
WORKDIR /app
# Copy the entire monorepo
COPY . .
# Install dependencies for the whole monorepo
RUN npm install
# Build the api app using turbo
RUN npx turbo run build --filter=api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy node_modules and built assets
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 4000

CMD ["node", "dist/main.js"]
