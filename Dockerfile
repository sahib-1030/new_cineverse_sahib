# ==============================================================================
# Multi-Stage Dockerfile for CineVerse (Next.js 14 App Router Standalone)
# ==============================================================================

# Stage 1: Base Alpine image with libc6-compat for performance and compatibility
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Stage 2: Install dependencies based on package-lock.json
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 3: Build the Next.js standalone application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Stage 4: Minimal production runtime running as non-root user
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create dedicated non-root user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and SQL migration files
COPY --from=builder /app/public ./public
COPY --from=builder /app/db ./db

# Prepare .next directory with correct ownership
RUN mkdir .next && chown nextjs:nodejs .next

# Copy Next.js standalone build artifacts
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
