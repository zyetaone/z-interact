#!/bin/bash

# Cloudflare R2 Setup Script for z-interact
# This script helps set up the R2 bucket for image storage

set -e

echo "🚀 Setting up Cloudflare R2 for z-interact"
echo "=========================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI is not installed. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in to Cloudflare
if ! wrangler auth status &> /dev/null; then
    echo "❌ You are not logged in to Cloudflare. Please login first:"
    echo "wrangler auth login"
    exit 1
fi

# Get bucket name from wrangler.toml
BUCKET_NAME=$(grep "bucket_name" wrangler.toml | head -1 | cut -d'"' -f2)

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ Could not find bucket_name in wrangler.toml"
    exit 1
fi

echo "📦 Creating R2 bucket: $BUCKET_NAME"

# Create the R2 bucket
if wrangler r2 bucket create "$BUCKET_NAME"; then
    echo "✅ R2 bucket '$BUCKET_NAME' created successfully"
else
    echo "⚠️  R2 bucket '$BUCKET_NAME' may already exist or creation failed"
fi

echo ""
echo "🔧 R2 Bucket Configuration Complete!"
echo "===================================="
echo ""
echo "Next steps:"
echo "1. Update your wrangler.toml R2_PUBLIC_URL with your custom domain or r2.dev URL"
echo "2. Set ENABLE_R2_STORAGE=true in your environment variables"
echo "3. Run the migration script to move existing images to R2:"
echo "   curl -X POST http://localhost:8788/api/migrate-images"
echo ""
echo "For production deployment:"
echo "1. Make sure your Cloudflare Pages project has the R2 bucket binding"
echo "2. Configure CORS settings for your R2 bucket if needed"
echo "3. Set up a custom domain for your R2 bucket (optional)"
echo ""
echo "📚 Useful commands:"
echo "- List R2 buckets: wrangler r2 bucket list"
echo "- View bucket contents: wrangler r2 object list $BUCKET_NAME"
echo "- Delete bucket: wrangler r2 bucket delete $BUCKET_NAME"