#!/bin/bash

# Migration script for Cloudflare D1 database
# Usage: ./scripts/migrate-d1.sh

echo "🚀 Applying migrations to Cloudflare D1 database..."

# Database name from wrangler.toml
DB_NAME="z-interact-db"

# Apply migrations in order
echo "📦 Applying migration 0000_huge_misty_knight.sql..."
wrangler d1 execute $DB_NAME --remote --file=./drizzle/0000_huge_misty_knight.sql

echo "📦 Applying migration 0001_slow_victor_mancha.sql..."
wrangler d1 execute $DB_NAME --remote --file=./drizzle/0001_slow_victor_mancha.sql

echo "📦 Applying migration 0002_fantastic_valeria_richards.sql..."
wrangler d1 execute $DB_NAME --remote --file=./drizzle/0002_fantastic_valeria_richards.sql

echo "✅ All migrations applied successfully!"

# Verify tables exist
echo "🔍 Verifying tables were created..."
wrangler d1 execute $DB_NAME --remote --command="SELECT name FROM sqlite_master WHERE type='table';"

echo "🎉 Migration complete!"