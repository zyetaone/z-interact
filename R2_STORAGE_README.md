# R2 Storage Service for z-interact

A comprehensive Cloudflare R2 storage service class designed for the z-interact application, providing seamless integration with the existing image generation workflow.

## Features

- ✅ **Image Upload**: Upload images to R2 bucket with proper metadata
- ✅ **Public URL Generation**: Generate CDN-accessible URLs for images
- ✅ **Image Download**: Download and serve images from R2
- ✅ **Error Handling**: Comprehensive error handling and validation
- ✅ **Key Generation**: Organized key generation and management
- ✅ **Workflow Integration**: Seamless integration with existing image generation
- ✅ **Batch Operations**: Support for batch upload operations
- ✅ **Migration Support**: Migrate existing base64 images to R2
- ✅ **Metadata Management**: Rich metadata storage and retrieval
- ✅ **Cloudflare Workers Compatible**: Optimized for serverless environment

## Architecture

### Core Components

1. **R2Storage Class** (`src/lib/server/r2-storage.ts`)
   - Main storage service with all R2 operations
   - Comprehensive error handling and validation
   - TypeScript interfaces for type safety

2. **R2StorageIntegration Class** (`src/lib/server/r2-storage-integration.ts`)
   - Integration layer with existing database and AI services
   - Workflow orchestration for image generation and storage
   - Migration utilities for existing data

3. **Database Integration**
   - Seamless integration with existing Drizzle ORM schema
   - Support for both R2 URLs and base64 fallbacks
   - Metadata storage in custom fields

## Installation & Setup

### 1. Environment Variables

Add to your `wrangler.toml`:

```toml
# R2 Configuration
R2_PUBLIC_URL = "https://images.z-interact.com"  # Your custom domain
ENABLE_R2_STORAGE = "true"  # Enable R2 storage
MIGRATION_BATCH_SIZE = "10"

# Optional: For r2.dev URLs (if not using custom domain)
R2_ACCOUNT_ID = "your-cloudflare-account-id"
R2_BUCKET_NAME = "z-interact-images"
```

### 2. Cloudflare R2 Bucket Setup

1. Create an R2 bucket in your Cloudflare dashboard
2. Set up a custom domain (recommended) or use r2.dev
3. Configure CORS policies for your domain
4. Add the bucket binding to `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "R2_IMAGES"
bucket_name = "z-interact-images"
```

### 3. Usage in Code

#### Basic Usage

```typescript
import { R2Storage } from '$lib/server/r2-storage';
import { createR2StorageIntegration } from '$lib/server/r2-storage-integration';

// Initialize R2 storage
const r2Storage = new R2Storage({
	bucket: platform.env.R2_IMAGES,
	publicUrl: platform.env.R2_PUBLIC_URL
});

// Or use the integration class
const r2Integration = createR2StorageIntegration(platform);
```

#### Generate and Store Image

```typescript
// Generate and store image with full integration
const result = await r2Integration.generateAndStoreImage(
	'A modern workspace for a baby boomer',
	'baby-boomer',
	'session-123',
	'participant-456',
	'1024x1024',
	'standard'
);

console.log('Image stored:', result.publicUrl);
```

#### Upload Existing Image

```typescript
// Upload image data directly
const uploadResult = await r2Storage.uploadImage(
	imageBuffer, // ArrayBuffer or base64 string
	'images/baby-boomer/1234567890-abc123.jpg',
	{
		contentType: 'image/jpeg',
		customMetadata: {
			personaId: 'baby-boomer',
			prompt: 'Modern workspace',
			provider: 'openai'
		}
	}
);
```

#### Download Image

```typescript
// Download image from R2
const downloadResult = await r2Storage.downloadImage('images/baby-boomer/1234567890-abc123.jpg');
console.log('Image size:', downloadResult.size);
console.log('Content type:', downloadResult.contentType);
```

#### Batch Operations

```typescript
// Upload multiple images concurrently
const batchResult = await r2Storage.batchUploadImages([
	{
		data: imageBuffer1,
		key: 'images/persona1/image1.jpg',
		options: { contentType: 'image/jpeg' }
	},
	{
		data: imageBuffer2,
		key: 'images/persona1/image2.jpg',
		options: { contentType: 'image/jpeg' }
	}
]);

console.log(`Uploaded: ${batchResult.successful.length}, Failed: ${batchResult.failed.length}`);
```

## Key Generation Strategy

Images are organized with the following key structure:

```
images/{sessionId}/{personaId}/{timestamp}-{randomId}.{extension}
```

Examples:

- `images/session123/baby-boomer/1703123456789-abc123def.jpg`
- `images/baby-boomer/1703123456789-def456ghi.png`

This organization provides:

- **Session-based grouping**: Images from the same session are grouped together
- **Persona-based sub-grouping**: Easy filtering by persona type
- **Timestamp sorting**: Chronological ordering
- **Unique identification**: Random ID prevents collisions

## Metadata Management

Rich metadata is stored with each image:

```typescript
{
  personaId: 'baby-boomer',
  sessionId: 'session-123',
  participantId: 'participant-456',
  prompt: 'A modern workspace design...',
  provider: 'openai',
  generatedAt: '2024-01-01T12:00:00.000Z',
  size: '1024x1024',
  quality: 'standard',
  originalUrl: 'https://oaidalleapiprodscus.blob.core.windows.net/...'
}
```

## Error Handling

The service provides comprehensive error handling:

```typescript
try {
	const result = await r2Storage.uploadImage(data, key, options);
} catch (error) {
	if (error instanceof Error) {
		console.error('Upload failed:', error.message);
		// Handle specific error types
	}
}
```

Common error scenarios:

- Invalid image data
- Network connectivity issues
- R2 bucket permissions
- Key validation failures
- Content type mismatches

## Migration from Base64

Migrate existing base64 images to R2 storage:

```typescript
// Migrate single image
const migrationResult = await r2Integration.migrateImageToR2('image-id-123');

// Get storage statistics
const stats = await r2Integration.getStorageStats();
console.log(`R2 images: ${stats.r2Images}/${stats.totalImages}`);
```

## Performance Considerations

### Caching Strategy

- Images are cached for 1 year (31536000 seconds) by default
- Cache headers can be customized per upload
- CDN distribution for global performance

### Concurrency Limits

- Batch uploads limited to 5 concurrent operations
- Configurable concurrency for different environments
- Automatic retry logic for transient failures

### File Size Limits

- Warnings for images over 10MB
- Automatic validation of image data
- Size tracking in metadata

## Security Features

- **Input Validation**: Comprehensive validation of all inputs
- **Content Type Verification**: Ensures uploaded content is valid images
- **Key Sanitization**: Prevents directory traversal attacks
- **Metadata Encryption**: Sensitive data can be encrypted in metadata
- **Access Control**: Integration with Cloudflare security features

## Monitoring & Analytics

### Storage Statistics

```typescript
const stats = await r2Integration.getStorageStats();
// Returns: total images, R2 vs base64 counts, storage size, etc.
```

### Image Metadata

```typescript
const metadata = await r2Storage.getImageMetadata('image-key');
// Returns: persona info, generation details, file info, etc.
```

## API Endpoints Integration

The service integrates seamlessly with existing API endpoints:

- `/api/generate-image` - Enhanced with R2 storage option
- `/api/images/[imageId]` - R2-aware image serving
- `/api/migrate-images` - Batch migration utilities

## Testing

Run the test script to verify R2 connectivity:

```bash
node scripts/test-r2.js
```

Test script validates:

- R2 bucket access
- Upload/download operations
- Public URL generation
- Metadata handling

## Troubleshooting

### Common Issues

1. **"Public URL not configured"**
   - Set `R2_PUBLIC_URL` in environment variables
   - Or provide `accountId` and `bucketName` for r2.dev URLs

2. **Upload Failures**
   - Check R2 bucket permissions
   - Verify bucket binding in `wrangler.toml`
   - Ensure image data is valid

3. **CORS Issues**
   - Configure CORS policies in Cloudflare dashboard
   - Add your domain to allowed origins

### Debug Mode

Enable detailed logging:

```typescript
// Logs are automatically enabled in development
// Check console output for detailed operation logs
```

## Future Enhancements

- **Image Optimization**: Automatic resizing and format conversion
- **CDN Purging**: Cache invalidation for updated images
- **Analytics**: Usage statistics and performance metrics
- **Backup**: Automated backup to secondary storage
- **Multi-region**: Cross-region replication support

## Contributing

When extending the R2 storage service:

1. Maintain TypeScript type safety
2. Add comprehensive error handling
3. Update documentation for new features
4. Include tests for new functionality
5. Follow existing code patterns and conventions

## License

This R2 storage service is part of the z-interact application and follows the same licensing terms.
