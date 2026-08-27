#!/usr/bin/env bash
# Applies db/migrations/*.sql in numeric order against $DATABASE_URL, then
# regenerates prisma/schema.prisma from the result via introspection.
#
# The SQL migrations are the source of truth (see db/README.md) -- Prisma is
# a read layer on top via `prisma db pull`, never `prisma migrate`.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

for f in db/migrations/*.sql; do
  echo "Applying $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

npx prisma db pull
npx prisma generate
