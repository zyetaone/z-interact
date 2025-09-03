# Cloudflare R2 Setup Guide for z-interact

This guide will help you set up Cloudflare R2 storage for the z-interact application to store generated images efficiently.

## Overview

The z-interact application uses Cloudflare R2 for scalable, cost-effective image storage. R2 provides:

- Global CDN distribution
- Pay-as-you-go pricing
- Integration with Cloudflare Workers
- Automatic replication and durability

## Prerequisites

1. **Cloudflare Account**: You need a Cloudflare account with access to R2
2. **Wrangler CLI**: Install the Cloudflare Wrangler CLI globally
   ```bash
   npm install -g wrangler
   ```
3. **Cloudflare Authentication**: Login to your Cloudflare account
   ```bash
   wrangler auth login
   ```

## Quick Setup

### 1. Run the Automated Setup Script

```bash
# Make sure you're in the project root directory
cd /path/to/z-interact

# Run the setup script
./scripts/setup-r2.sh
```

This script will:

- Check your Cloudflare authentication
- Create the R2 bucket defined in `wrangler.toml`
- Provide next steps for configuration

### 2. Configure Environment Variables

Update your environment variables (either in `.env` for local development or Cloudflare Pages environment):

```bash
# For production (Cloudflare Pages)
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
ENABLE_R2_STORAGE=true

# For local development with r2.dev (optional)
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_ACCOUNT_ID=your-cloudflare-account-id
```

### 3. Enable R2 Storage

Once your bucket is created and configured:

1. **For Local Development**:

   ```bash
   # Set the environment variable
   export ENABLE_R2_STORAGE=true
   ```

2. **For Production**:
   - Go to your Cloudflare Pages project dashboard
   - Navigate to Settings > Environment variables
   - Add `ENABLE_R2_STORAGE=true`

## Manual Setup (Alternative)

If you prefer to set up R2 manually:

### 1. Create R2 Bucket

```bash
# Create the bucket
wrangler r2 bucket create z-interact-images

# Verify bucket creation
wrangler r2 bucket list
```

### 2. Configure Bucket Permissions

For public access to images, you may need to configure CORS. Create a `cors.json` file:

```json
[
	{
		"AllowedOrigins": ["*"],
		"AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
		"AllowedHeaders": ["*"],
		"MaxAgeSeconds": 3000
	}
]
```

Apply CORS configuration:

```bash
wrangler r2 bucket cors put z-interact-images --file cors.json
```

### 3. Set Up Custom Domain (Optional)

For a custom domain instead of the default r2.dev URL:

1. Go to Cloudflare Dashboard > R2
2. Select your bucket
3. Go to Settings > Custom Domain
4. Add your custom domain
5. Update `R2_PUBLIC_URL` in your environment variables

## Configuration Files

### wrangler.toml

The R2 bucket is already configured in `wrangler.toml`:

```toml
# R2 Bucket binding for image storage
[[r2_buckets]]
binding = "R2_IMAGES"
bucket_name = "z-interact-images"

# Environment variables
[vars]
R2_PUBLIC_URL = "https://images.z-interact.com"
ENABLE_R2_STORAGE = "false"  # Set to "true" after setup
```

### Environment Variables

Add these to your `.env` file for local development:

```bash
# R2 Configuration
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_ACCOUNT_ID=your-account-id
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
ENABLE_R2_STORAGE=true
```

## Migration from Base64 Storage

If you have existing images stored as base64 in your database, you can migrate them to R2:

### Automatic Migration

```bash
# Start your development server
npm run dev:wrangler

# Run the migration endpoint
curl -X POST http://localhost:8788/api/migrate-images
```

### Manual Migration

Use the migration utilities in `src/lib/server/migration-utils.ts`:

```typescript
import { ImageMigrator } from '$lib/server/migration-utils';

// Initialize migrator
const migrator = new ImageMigrator(r2Storage, db);

// Migrate all images
await migrator.migrateAllImages();

// Validate migration
const result = await migrator.validateMigration();
console.log('Migration result:', result);
```

## Testing R2 Integration

### 1. Test Image Generation with R2

```bash
# Generate an image (this should now use R2 if enabled)
curl -X POST http://localhost:8788/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{"personaId": "millennial", "prompt": "test workspace"}'
```

### 2. Verify R2 Storage

```bash
# List objects in your R2 bucket
wrangler r2 object list z-interact-images

# Check bucket info
wrangler r2 bucket info z-interact-images
```

### 3. Test Image Retrieval

```bash
# Get an image from R2
curl https://your-bucket.r2.cloudflarestorage.com/images/millennial/123456.jpg
```

## Troubleshooting

### Common Issues

1. **"R2 bucket not configured" error**
   - Ensure `ENABLE_R2_STORAGE=true` in your environment
   - Check that the R2 bucket binding exists in `wrangler.toml`
   - Verify the bucket name matches exactly

2. **"Failed to upload image to R2" error**
   - Check your Cloudflare authentication: `wrangler auth status`
   - Verify the bucket exists: `wrangler r2 bucket list`
   - Ensure you have write permissions on the bucket

3. **Images not loading from R2**
   - Check `R2_PUBLIC_URL` is correctly set
   - Verify CORS settings if accessing from browser
   - Ensure the bucket has public read access

### Debug Commands

```bash
# Check wrangler authentication
wrangler auth status

# List all R2 buckets
wrangler r2 bucket list

# List objects in bucket
wrangler r2 object list z-interact-images

# Check bucket info
wrangler r2 bucket info z-interact-images

# View wrangler configuration
wrangler whoami
```

## Performance Optimization

### 1. Cache Control

Images uploaded to R2 include cache headers for optimal performance:

- `Cache-Control: public, max-age=31536000` (1 year)
- Automatic CDN distribution through Cloudflare

### 2. Image Optimization

Consider implementing:

- Image resizing before upload
- WebP format conversion
- Lazy loading in the frontend

### 3. Cost Optimization

- Monitor R2 usage in Cloudflare dashboard
- Set up billing alerts
- Consider lifecycle policies for old images

## Security Considerations

1. **Access Control**: Keep R2 credentials secure
2. **CORS**: Configure appropriate CORS policies
3. **Public Access**: Only make images public if needed
4. **Environment Variables**: Never commit secrets to version control

## Support

For additional help:

- Cloudflare R2 Documentation: https://developers.cloudflare.com/r2/
- Wrangler CLI Reference: https://developers.cloudflare.com/workers/wrangler/
- z-interact Issues: https://github.com/your-repo/z-interact/issues
