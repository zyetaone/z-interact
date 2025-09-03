# Cloudflare R2 Migration Implementation Plan

## Overview

This implementation plan provides a comprehensive guide for migrating from base64 database storage to Cloudflare R2 object storage for the z-interact application. The migration includes configuration, implementation, testing, and rollback strategies.

## Architecture Changes

### Current Architecture

- Images stored as base64 strings in SQLite database
- Direct database queries for image retrieval
- No CDN caching or optimization
- Limited scalability for large image volumes

### Target Architecture

- Images stored in Cloudflare R2 buckets
- Database stores only metadata and R2 object keys
- CDN caching via custom domains or r2.dev
- Global distribution and optimization
- Cost-effective storage with no egress fees

## Implementation Steps

### Phase 1: Infrastructure Setup

#### 1.1 Create R2 Bucket

```bash
# Create R2 bucket
npx wrangler r2 bucket create z-interact-images

# Verify bucket creation
npx wrangler r2 bucket list
```

#### 1.2 Configure Custom Domain (Recommended)

```bash
# Add DNS record for custom domain
# images.yourdomain.com CNAME -> your-zone-id.r2.cloudflarestorage.com

# Configure bucket for custom domain
npx wrangler r2 bucket domain add z-interact-images images.yourdomain.com
```

#### 1.3 Update Wrangler Configuration

```toml
# wrangler.toml
[[r2_buckets]]
binding = "R2_IMAGES"
bucket_name = "z-interact-images"

[vars]
R2_PUBLIC_URL = "https://images.yourdomain.com"
MIGRATION_BATCH_SIZE = "10"
ENABLE_R2_STORAGE = "false"  # Keep false during migration
```

#### 1.4 Set CORS Policy

```bash
# Configure CORS for web access
npx wrangler r2 bucket cors put z-interact-images --file cors-policy.json
```

```json
// cors-policy.json
[
	{
		"AllowedOrigins": ["https://yourdomain.com"],
		"AllowedMethods": ["GET", "HEAD"],
		"MaxAgeSeconds": 3600
	}
]
```

### Phase 2: Code Implementation

#### 2.1 R2 Storage Service

The `R2Storage` class provides a clean interface for R2 operations:

```typescript
const r2Storage = new R2Storage({
	bucket: platform.env.R2_IMAGES,
	publicUrl: platform.env.R2_PUBLIC_URL
});

// Upload image
const object = await r2Storage.uploadImage(imageBuffer, key, {
	contentType: 'image/jpeg',
	customMetadata: { personaId, prompt }
});

// Get public URL
const publicUrl = r2Storage.getPublicUrl(key);
```

#### 2.2 Migration Service

The `ImageMigrationService` handles the migration process:

```typescript
const migrationService = new ImageMigrationService({
	r2Storage,
	batchSize: 10,
	dryRun: false
});

// Migrate all images
const result = await migrationService.migrateAllImages();

// Validate migration
const validation = await migrationService.validateMigration();
```

#### 2.3 Updated Image Generation

Modified `/api/generate-image` endpoint with dual storage support:

```typescript
// Check if R2 is enabled
const enableR2 = platform?.env?.ENABLE_R2_STORAGE === 'true';

if (enableR2 && platform?.env?.R2_IMAGES) {
  // Store in R2
  const r2Storage = new R2Storage({ ... });
  const r2Key = r2Storage.generateImageKey(personaId, 'jpg');
  await r2Storage.uploadImage(imageBuffer, r2Key, { ... });
  finalImageUrl = r2Storage.getPublicUrl(r2Key);
} else {
  // Fallback to base64
  const storageResult = await imageStorage.downloadAndStoreImage(result.imageUrl);
  finalImageUrl = storageResult.url;
}
```

### Phase 3: Migration Execution

#### 3.1 Pre-Migration Checklist

- [ ] R2 bucket created and configured
- [ ] Custom domain set up (optional but recommended)
- [ ] CORS policies configured
- [ ] Wrangler configuration updated
- [ ] Code deployed to staging environment
- [ ] Database backup created

#### 3.2 Migration Steps

```bash
# 1. Test R2 connectivity
curl https://your-worker.dev/api/migrate-images

# 2. Run dry-run migration
curl -X POST https://your-worker.dev/api/migrate-images \
  -H "Content-Type: application/json" \
  -d '{"action": "migrate", "dryRun": true}'

# 3. Execute actual migration
curl -X POST https://your-worker.dev/api/migrate-images \
  -H "Content-Type: application/json" \
  -d '{"action": "migrate", "batchSize": 10}'

# 4. Validate migration
curl -X POST https://your-worker.dev/api/migrate-images \
  -H "Content-Type: application/json" \
  -d '{"action": "validate"}'
```

#### 3.3 Post-Migration Steps

```bash
# Enable R2 storage in production
npx wrangler secret put ENABLE_R2_STORAGE
# Enter: true

# Deploy updated configuration
npx wrangler deploy

# Monitor application for 24 hours
# Check logs for any R2-related errors
```

### Phase 4: Rollback Plan

#### 4.1 Emergency Rollback

If issues arise after migration:

```bash
# 1. Disable R2 storage
npx wrangler secret put ENABLE_R2_STORAGE
# Enter: false

# 2. Rollback images to database
curl -X POST https://your-worker.dev/api/migrate-images \
  -H "Content-Type: application/json" \
  -d '{"action": "rollback"}'

# 3. Deploy rollback
npx wrangler deploy
```

#### 4.2 Partial Rollback

For rolling back specific images:

```typescript
// Rollback specific image by ID
const imageId = 'specific-image-id';
await db
	.update(images)
	.set({ imageData: base64Data, imageUrl: null })
	.where(eq(images.id, imageId));
```

## Performance Optimizations

### CDN Configuration

```bash
# Enable Cloudflare CDN features
# - Polish for image optimization
# - Mirage for format conversion
# - Cache rules for long-term caching
```

### R2 Storage Classes

```typescript
// Use Infrequent Access for older images
await r2Storage.uploadImage(buffer, key, {
	storageClass: 'InfrequentAccess'
});
```

### Multipart Uploads

```typescript
// For large images (>100MB)
const multipartUpload = await bucket.createMultipartUpload(key);
// Upload parts...
await multipartUpload.complete(uploadedParts);
```

## Monitoring and Maintenance

### Health Checks

```typescript
// R2 connectivity check
export async function checkR2Health(): Promise<boolean> {
	try {
		await r2Storage.listImages({ limit: 1 });
		return true;
	} catch {
		return false;
	}
}
```

### Metrics to Monitor

- R2 storage usage and costs
- Image load times and cache hit rates
- Migration progress and error rates
- Database storage reduction

### Backup Strategy

- Maintain database backups during migration
- Keep R2 objects for rollback period (30 days)
- Implement cross-region replication for critical data

## Cost Analysis

### Before Migration (Base64 in Database)

- Database storage costs
- No CDN benefits
- Potential performance issues with large datasets

### After Migration (R2 Storage)

- Lower storage costs ($0.015/GB/month)
- No egress fees within Cloudflare network
- CDN caching reduces origin requests
- Global distribution improves performance

### Migration Cost Estimate

- R2 storage: $0.015/GB × data size
- One-time migration compute costs
- Potential temporary dual storage costs

## Security Considerations

### Access Control

- Use presigned URLs for private images
- Implement proper CORS policies
- Regular audit of bucket permissions

### Data Encryption

- R2 encrypts data at rest by default
- Use SSE-C for additional encryption
- Implement proper key management

### Backup and Recovery

- Cross-region replication for critical data
- Regular backups of R2 bucket contents
- Versioning for object recovery

## Troubleshooting

### Common Issues

#### R2 Upload Failures

```typescript
// Check bucket permissions
npx wrangler r2 bucket list

// Verify bucket binding
console.log(platform.env.R2_IMAGES)
```

#### CORS Errors

```typescript
// Update CORS policy
npx wrangler r2 bucket cors put bucket-name --file cors-policy.json
```

#### Migration Timeouts

```typescript
// Increase batch size or implement retry logic
const migrationService = new ImageMigrationService({
	r2Storage,
	batchSize: 5 // Reduce batch size
});
```

## Testing Strategy

### Unit Tests

```typescript
describe('R2Storage', () => {
	it('should upload image successfully', async () => {
		const buffer = new ArrayBuffer(1024);
		const object = await r2Storage.uploadImage(buffer, 'test.jpg');
		expect(object.key).toBe('test.jpg');
	});
});
```

### Integration Tests

- Test image upload/download cycle
- Verify public URL accessibility
- Test migration with sample data
- Validate CORS functionality

### Load Testing

- Simulate concurrent image uploads
- Test CDN performance under load
- Monitor R2 API rate limits

## Deployment Checklist

- [ ] Infrastructure configured
- [ ] Code implemented and tested
- [ ] Migration scripts ready
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Team trained on new system
- [ ] Go-live date scheduled
- [ ] Post-migration support planned

## Support and Documentation

### Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [SvelteKit Cloudflare Adapter](https://kit.svelte.dev/docs/adapter-cloudflare)

### Getting Help

- Cloudflare Community Forums
- GitHub Issues for specific problems
- Cloudflare Support for account-specific issues

---

## Quick Start Commands

```bash
# Setup
npx wrangler r2 bucket create z-interact-images
npx wrangler r2 bucket domain add z-interact-images images.yourdomain.com

# Deploy
npx wrangler deploy

# Migrate
curl -X POST /api/migrate-images -d '{"action": "migrate"}'

# Monitor
curl /api/migrate-images
```

This implementation plan provides a production-ready migration strategy with comprehensive error handling, monitoring, and rollback capabilities.</content>
</xai:function_call">The comprehensive implementation plan covers all aspects of migrating from base64 database storage to Cloudflare R2, including infrastructure setup, code changes, migration execution, monitoring, and rollback strategies.
