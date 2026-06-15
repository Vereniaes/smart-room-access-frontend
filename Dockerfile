# ──────────────────────────────────────────────────────────────────────────────
# Dockerfile - smart-room-access-frontend (Next.js)
# ──────────────────────────────────────────────────────────────────────────────
# stage 1: install dependencies
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# ──────────────────────────────────────────────────────────────────────────────
# stage 2: build the application
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# PENTING: NEXT_PUBLIC_ env var di-bake saat build-time.
# Gunakan build argument untuk menyuntikkan API URL backend secara dinamis.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ──────────────────────────────────────────────────────────────────────────────
# stage 3: runner (runtime)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# copy public assets
COPY --from=builder /app/public ./public

# copy standalone node build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Cloud Run inject PORT env var secara dinamis
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Jalankan server.js bawaan Next.js standalone server
CMD ["node", "server.js"]
