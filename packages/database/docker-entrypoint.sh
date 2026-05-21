#!/bin/sh
# File: packages/database/docker-entrypoint.sh
# Purpose: Runs inside the migrate container.
#          1. Runs prisma migrate deploy — applies all pending migrations
#          2. Runs prisma db seed — only if the user table is empty
#          Exits with non-zero code on failure so docker-compose marks
#          the service as failed and the backend never starts.

set -e  # exit immediately on any error

echo "🗄  Running database migrations..."
cd /app
pnpm --filter @repo/database exec prisma migrate deploy

echo ""
echo "🌱 Checking if seed is needed..."

# Check if the user table has any rows.
# If empty → seed. If already has data → skip (idempotent).
USER_COUNT=$(pnpm --filter @repo/database exec prisma db execute \
  --stdin <<< "SELECT COUNT(*) FROM \"user\";" 2>/dev/null | \
  grep -oP '\d+' | head -1 || echo "0")

if [ "$USER_COUNT" = "0" ]; then
  echo "   Table is empty — running seed..."
  pnpm --filter @repo/database db:seed
  echo "   ✓ Seed complete"
else
  echo "   Data already exists (${USER_COUNT} users) — skipping seed"
fi

echo ""
echo "✅ Database ready"
