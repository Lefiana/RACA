# File: packages/database/Dockerfile
# Purpose: One-shot container that runs prisma migrate deploy + seed.
#          Exits after completion. Backend waits for this to succeed.
#          Uses "migrate deploy" (not "migrate dev") — deploy is safe for
#          automated environments and never prompts for input.

FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace manifests first for layer caching
# If these don't change, pnpm install layer is cached
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

# Copy all package.json files (needed for workspace resolution)
COPY apps/backend/package.json ./apps/backend/
COPY apps/web/package.json     ./apps/web/
COPY packages/database/package.json ./packages/database/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy the database package source
COPY packages/database/ ./packages/database/

# Generate the Prisma client from the schema
RUN pnpm --filter @repo/database exec prisma generate

# Copy the entrypoint script and set executable permission inside the image
# This is done here (not on the host) so Windows users don't need chmod
COPY packages/database/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]