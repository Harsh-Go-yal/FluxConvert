FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /app
COPY . .
RUN npm install -g turbo
RUN turbo prune --scope=api --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm install

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
RUN npm run build --filter=api...

FROM base AS runner
WORKDIR /app
COPY --from=installer /app/apps/api/dist ./dist
COPY --from=installer /app/apps/api/package.json .
COPY --from=installer /app/node_modules ./node_modules

# Install LibreOffice for PPTX conversion
RUN apk add --no-cache libreoffice ttf-freefont

CMD node dist/main
