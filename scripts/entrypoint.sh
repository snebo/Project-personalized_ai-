#!/bin/bash
set -e

echo "Starting Entrypoint Script..."

# Extract DB connection details from DATABASE_URL or use individual variables
# DATABASE_URL=postgresql://postgres:postgres@db:5432/postgres
DB_HOST=$(echo $DATABASE_URL | sed -e 's|.*@||' -e 's|:.*||')
DB_PORT=$(echo $DATABASE_URL | sed -e 's|.*:||' -e 's|/.*||')
DB_USER=$(echo $DATABASE_URL | sed -e 's|.*//||' -e 's|:.*||')

echo "Waiting for database at $DB_HOST:$DB_PORT..."

# Wait for the database to be ready
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "Database is unavailable - sleeping..."
  sleep 2
done

echo "Database is up - executing migrations (if any)..."
# If you have migrations, run them here. For example:
# pnpm run migration:run

echo "Running tests..."
pnpm test

echo "Starting application with command: $@"
exec "$@"