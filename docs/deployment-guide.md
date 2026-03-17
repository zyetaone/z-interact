# Z-Interact Production Deployment Guide

This guide covers deploying Z-Interact to Cloudflare Pages with D1 database and R2 storage.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install globally with `npm install -g wrangler`
3. **GitHub Repository**: Your code should be in a GitHub repository

## Environment Variables

### Required for Production

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
DATABASE_URL=file:./local.db  # Only for local development

# R2 Storage Configuration
ENABLE_R2_STORAGE=true
R2_PUBLIC_URL=https://images.yourdomain.com  # Your custom domain or R2 dev URL
MIGRATION_BATCH_SIZE=10

# Optional: Session Management
SESSION_SECRET=your_session_secret_here
```

### Cloudflare Pages Environment Variables

Set these in your Cloudflare Pages dashboard:

1. Go to Pages → Your Project → Settings → Environment variables
2. Add the following variables:

| Variable               | Value                           | Notes                      |
| ---------------------- | ------------------------------- | -------------------------- |
| `OPENAI_API_KEY`       | `sk-...`                        | Your OpenAI API key        |
| `ENABLE_R2_STORAGE`    | `true`                          | Enable R2 image storage    |
| `R2_PUBLIC_URL`        | `https://images.yourdomain.com` | Your R2 public URL         |
| `MIGRATION_BATCH_SIZE` | `10`                            | Images per migration batch |

## Database Setup (D1)

### 1. Create D1 Database

```bash
# Login to Cloudflare
wrangler auth login

# Create D1 database
wrangler d1 create z-interact-db
```

### 2. Update wrangler.toml

Update the `database_id` in your `wrangler.toml`:

```toml
[[d1_databases]]
binding = "z_interact_db"
database_name = "z-interact-db"
database_id = "your-database-id-from-step-1"
migrations_dir = "drizzle"
```

### 3. Run Database Migrations

```bash
# Apply migrations to production database
wrangler d1 migrations apply z-interact-db
```

## R2 Storage Setup

### 1. Create R2 Bucket

```bash
# Create R2 bucket for image storage
wrangler r2 bucket create z-interact-images
```

### 2. Configure Custom Domain (Optional but Recommended)

1. Go to R2 → Your Bucket → Settings → Custom Domains
2. Add your domain (e.g., `images.yourdomain.com`)
3. Update `R2_PUBLIC_URL` in your environment variables

### 3. Set CORS Policy (if needed)

```bash
# Create cors.json file
echo '[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]' > cors.json

# Apply CORS policy
wrangler r2 bucket cors put z-interact-images --file cors.json
```

## Cloudflare Pages Deployment

### 1. Connect GitHub Repository

1. Go to Cloudflare Pages dashboard
2. Click "Create a project" → "Connect to Git"
3. Select your GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `.svelte-kit/cloudflare`
   - **Root directory**: `/` (or your project root)

### 2. Configure Bindings

In your Pages project settings:

1. **Functions** → **Compatibility flags**:
   - Add: `nodejs_compat`
   - Date: `2024-01-01`

2. **Functions** → **D1 database bindings**:
   - Variable name: `z_interact_db`
   - D1 database: Select your created database

3. **Functions** → **R2 bucket bindings**:
   - Variable name: `R2_IMAGES`
   - R2 bucket: `z-interact-images`

### 3. Deploy

The deployment will trigger automatically on git push to your main branch.

## Post-Deployment Setup

### 1. Verify Database Connection

Visit `https://your-app.pages.dev/api/db-test` to verify database connectivity.

### 2. Test R2 Storage

1. Go to your admin panel
2. Navigate to Storage Dashboard
3. Verify R2 configuration shows as "Configured"

### 3. Migrate Existing Images (if any)

If you have existing base64 images, migrate them to R2:

```bash
curl -X POST https://your-app.pages.dev/api/migrate-images \
  -H "Content-Type: application/json" \
  -d '{"action": "migrate", "batchSize": 10}'
```

## Monitoring and Maintenance

### Storage Dashboard

Access the storage dashboard at `https://your-app.pages.dev/admin/storage` to:

- Monitor storage health
- View migration statistics
- Run image migrations
- Check R2 connectivity

### Useful Commands

```bash
# Check D1 database status
wrangler d1 info z-interact-db

# List D1 databases
wrangler d1 list

# Query database directly
wrangler d1 execute z-interact-db --command "SELECT COUNT(*) FROM images"

# List R2 buckets
wrangler r2 bucket list

# View bucket contents
wrangler r2 object list z-interact-images

# Check bucket size
wrangler r2 bucket get z-interact-images
```

## Troubleshooting

### Common Issues

1. **"D1 database binding not available"**
   - Check wrangler.toml binding name matches exactly
   - Verify database is created and ID is correct
   - Ensure Pages function has D1 binding configured

2. **"R2 storage not configured"**
   - Verify R2 bucket exists
   - Check Pages R2 binding configuration
   - Ensure ENABLE_R2_STORAGE=true in environment

3. **"Database connection failed"**
   - Run database migrations: `wrangler d1 migrations apply z-interact-db`
   - Check database permissions
   - Verify schema is up to date

4. **Images not loading**
   - Check R2 bucket CORS configuration
   - Verify public URL is accessible
   - Check browser network tab for CORS errors

### Logs and Debugging

- **Pages Functions logs**: Cloudflare dashboard → Pages → Functions → Logs
- **Real-time logs**: `wrangler pages deployment tail`
- **Local debugging**: `npm run dev:local` to test with Cloudflare bindings

## Security Considerations

1. **Environment Variables**: Never commit API keys to git
2. **CORS Policy**: Configure restrictive CORS for R2 bucket
3. **Custom Domain**: Use HTTPS custom domain for R2 public URLs
4. **Access Control**: Implement proper authentication for admin functions

## Scaling Considerations

1. **D1 Limits**:
   - 100,000 rows per day (free tier)
   - 5 million rows total (free tier)

2. **R2 Limits**:
   - 10 GB storage (free tier)
   - 1 million Class A operations per month

3. **Migration Strategy**:
   - Run migrations in batches to avoid timeouts
   - Monitor storage usage regularly
   - Consider cleanup strategies for old images

## Support

For issues specific to:

- **SvelteKit**: [SvelteKit Documentation](https://kit.svelte.dev/)
- **Cloudflare Pages**: [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- **D1 Database**: [D1 Documentation](https://developers.cloudflare.com/d1/)
- **R2 Storage**: [R2 Documentation](https://developers.cloudflare.com/r2/)
