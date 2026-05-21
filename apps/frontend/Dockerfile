# File: apps/frontend/Dockerfile
# Purpose: Multi-stage Dockerfile for the Next.js frontend.
#   "dev"   — next dev with hot reload, source mounted via compose volume
#   "build" — next build (standalone output)
#   "prod"  — lean production image using Next.js standalone output
#
# Build context is the monorepo ROOT.

# ─── Stage 1: base ────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

RUN npm install -g pnpm@9

COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml      ./
COPY package.json        ./

COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json     ./apps/frontend/
COPY packages/database/package.json ./packages/database/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: dev ─────────────────────────────────────────────────────────────
FROM base AS dev

WORKDIR /app

COPY apps/frontend/ ./apps/frontend/

WORKDIR /app/apps/frontend

EXPOSE 3000

# next dev — hot reload enabled, listens on all interfaces inside Docker
CMD ["pnpm", "run", "dev", "--", "--hostname", "0.0.0.0"]

# ─── Stage 3: build ───────────────────────────────────────────────────────────
FROM base AS build

WORKDIR /app

COPY apps/frontend/ ./apps/frontend/

WORKDIR /app/apps/frontend

# next build with standalone output mode
# Requires next.config.js to have: output: 'standalone'
RUN pnpm run build

# ─── Stage 4: prod ────────────────────────────────────────────────────────────
# Uses Next.js standalone output — self-contained Node server
# No need to copy node_modules separately
FROM node:20-alpine AS prod

WORKDIR /app

# Copy standalone output — includes everything needed to run
COPY --from=build /app/apps/frontend/.next/standalone ./
COPY --from=build /app/apps/frontend/.next/static      ./apps/frontend/.next/static
COPY --from=build /app/apps/frontend/public            ./apps/frontend/public

RUN addgroup -S raca && adduser -S raca -G raca
RUN chown -R raca:raca /app
USER raca

EXPOSE 3000

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

CMD ["node", "apps/frontend/server.js"]
