# File: apps/backend/Dockerfile
# Purpose: Multi-stage Dockerfile for the NestJS backend.
#   "base"  — shared setup (pnpm, dependencies)
#   "dev"   — development with ts-node watch, source mounted via compose volume
#   "build" — compiles TypeScript to dist/
#   "prod"  — lean production image, runs compiled output only
#
# Build context is the monorepo ROOT (not apps/backend).
# This is required so pnpm can resolve the full workspace.

# ─── Stage 1: base ────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9

# Copy workspace manifests — these change infrequently so they form a
# stable cache layer. pnpm install only reruns when these change.
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml      ./
COPY package.json        ./

# Copy all package.json files needed for workspace dependency resolution
COPY apps/backend/package.json ./apps/backend/
COPY apps/web/package.json     ./apps/web/
COPY packages/database/package.json ./packages/database/

# Install all workspace dependencies (including dev deps for building)
RUN pnpm install --frozen-lockfile

# Copy the database package — backend imports from @repo/database
COPY packages/database/ ./packages/database/

# Generate Prisma client inside the image
RUN pnpm --filter @repo/database exec prisma generate

# ─── Stage 2: dev ─────────────────────────────────────────────────────────────
# Used by docker-compose.yml for development.
# Source code is NOT copied here — it's mounted as a volume by compose.
# This means file changes on the host reflect instantly in the container.
FROM base AS dev

WORKDIR /app

# Copy backend source — this is overridden by the volume mount in compose
# but needed as a fallback if running the image directly
COPY apps/backend/ ./apps/backend/

WORKDIR /app/apps/backend

EXPOSE 3001

# ts-node with SWC transpiler (faster than tsc for watch mode)
# --watch flag from @nestjs/cli watches for file changes
CMD ["pnpm", "run", "start:dev"]

# ─── Stage 3: build ───────────────────────────────────────────────────────────
# Compiles TypeScript. Only runs during production builds.
FROM base AS build

WORKDIR /app

# Copy all backend source for compilation
COPY apps/backend/ ./apps/backend/

WORKDIR /app/apps/backend

# tsc compilation — outputs to apps/backend/dist/
RUN pnpm run build

# Prune dev dependencies — production image only needs runtime deps
WORKDIR /app
RUN pnpm prune --prod

# ─── Stage 4: prod ────────────────────────────────────────────────────────────
# Lean production image — only compiled output and runtime dependencies.
FROM node:20-alpine AS prod

WORKDIR /app

# Install pnpm (needed to run scripts)
RUN npm install -g pnpm@9

# Copy only what's needed to run the compiled app
COPY --from=build /app/node_modules             ./node_modules
COPY --from=build /app/apps/backend/dist        ./apps/backend/dist
COPY --from=build /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /app/packages/database         ./packages/database
COPY --from=build /app/package.json              ./package.json
COPY --from=build /app/pnpm-workspace.yaml       ./pnpm-workspace.yaml

# Create uploads directory
RUN mkdir -p /app/apps/backend/uploads

WORKDIR /app/apps/backend

# Non-root user for security
RUN addgroup -S raca && adduser -S raca -G raca
RUN chown -R raca:raca /app
USER raca

EXPOSE 3001

CMD ["node", "dist/main.js"]
