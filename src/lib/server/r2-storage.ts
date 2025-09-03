// Cloudflare R2 Storage Implementation for z-interact
export interface R2StorageConfig {
	bucket: any; // R2Bucket type from Cloudflare Workers
	publicUrl?: string; // For custom domain or r2.dev URL
	accountId?: string; // Cloudflare account ID for r2.dev URLs
	bucketName?: string; // Bucket name for r2.dev URLs
}

export interface ImageUploadOptions {
	contentType?: string;
	customMetadata?: Record<string, string>;
	cacheControl?: string;
}

export interface ImageUploadResult {
	key: string;
	publicUrl: string;
	size: number;
	uploadedAt: Date;
	metadata?: Record<string, string>;
}

export interface ImageDownloadResult {
	data: ArrayBuffer;
	contentType: string;
	size: number;
	lastModified?: Date;
	metadata?: Record<string, string>;
}

export interface StorageValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
}

export interface BatchUploadResult {
	successful: ImageUploadResult[];
	failed: { key: string; error: string }[];
}

export interface ImageMetadata {
	personaId: string;
	sessionId?: string;
	participantId?: string;
	prompt: string;
	provider: string;
	generatedAt: string;
	size: string;
	quality?: string;
}

export class R2Storage {
	private bucket: any;
	private publicUrl?: string;
	private accountId?: string;
	private bucketName?: string;

	constructor(config: R2StorageConfig) {
		this.bucket = config.bucket;
		this.publicUrl = config.publicUrl;
		this.accountId = config.accountId;
		this.bucketName = config.bucketName;
	}

	/**
	 * Upload image to R2 bucket with comprehensive error handling and validation
	 */
	async uploadImage(
		imageData: ArrayBuffer | string,
		key: string,
		options: ImageUploadOptions = {}
	): Promise<ImageUploadResult> {
		try {
			// Validate inputs
			const validation = this.validateUploadInputs(imageData, key, options);
			if (!validation.isValid) {
				throw new Error(`Upload validation failed: ${validation.errors.join(', ')}`);
			}

			// Convert string to ArrayBuffer if needed
			const data = typeof imageData === 'string' ? this.base64ToArrayBuffer(imageData) : imageData;

			// Prepare upload options
			const uploadOptions: any = {
				httpMetadata: {
					contentType: options.contentType || this.detectContentType(key),
					cacheControl: options.cacheControl || 'public, max-age=31536000' // 1 year cache
				}
			};

			if (options.customMetadata) {
				uploadOptions.customMetadata = options.customMetadata;
			}

			// Upload to R2
			const object = await this.bucket.put(key, data, uploadOptions);

			if (!object) {
				throw new Error('Failed to upload image to R2 - no response object');
			}

			const result: ImageUploadResult = {
				key,
				publicUrl: this.getPublicUrl(key),
				size: data.byteLength,
				uploadedAt: new Date(),
				metadata: options.customMetadata
			};

			console.log(`✅ Image uploaded to R2: ${key} (${this.formatBytes(data.byteLength)})`);
			return result;
		} catch (error) {
			console.error('❌ R2 upload failed:', error);
			throw new Error(
				`R2 upload failed for key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Download image from R2 bucket with enhanced error handling
	 */
	async downloadImage(key: string): Promise<ImageDownloadResult> {
		try {
			if (!key || typeof key !== 'string') {
				throw new Error('Invalid key provided for download');
			}

			const object = await this.bucket.get(key);

			if (!object) {
				throw new Error(`Image not found: ${key}`);
			}

			const result: ImageDownloadResult = {
				data: await object.arrayBuffer(),
				contentType: object.httpMetadata?.contentType || 'application/octet-stream',
				size: object.size || 0,
				lastModified: object.uploaded ? new Date(object.uploaded) : undefined,
				metadata: object.customMetadata || {}
			};

			console.log(`✅ Image downloaded from R2: ${key} (${this.formatBytes(result.size)})`);
			return result;
		} catch (error) {
			console.error('❌ R2 download failed:', error);
			throw new Error(
				`R2 download failed for key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Get public URL for image
	 */
	getPublicUrl(key: string): string {
		if (this.publicUrl) {
			// Custom domain or r2.dev URL
			return `${this.publicUrl}/${key}`;
		}

		// Fallback - requires public bucket access
		if (this.accountId && this.bucketName) {
			return `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}/${key}`;
		}

		throw new Error(
			'Public URL not configured. Set up custom domain or provide accountId and bucketName for r2.dev access.'
		);
	}

	/**
	 * Delete image from R2 bucket
	 */
	async deleteImage(key: string): Promise<void> {
		try {
			await this.bucket.delete(key);
			console.log(`🗑️ Image deleted from R2: ${key}`);
		} catch (error) {
			console.error('❌ R2 delete failed:', error);
			throw new Error(
				`R2 delete failed for key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * List images in bucket with optional prefix
	 */
	async listImages(
		options: {
			prefix?: string;
			limit?: number;
			cursor?: string;
		} = {}
	): Promise<any> {
		try {
			const listOptions: any = {
				limit: options.limit || 1000
			};

			if (options.prefix) {
				listOptions.prefix = options.prefix;
			}

			if (options.cursor) {
				listOptions.cursor = options.cursor;
			}

			return await this.bucket.list(listOptions);
		} catch (error) {
			console.error('❌ R2 list failed:', error);
			throw new Error(
				`R2 list failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Generate unique key for image with organized structure
	 */
	generateImageKey(personaId: string, extension: string = 'jpg', sessionId?: string): string {
		const timestamp = Date.now();
		const randomId = crypto.randomUUID().substring(0, 8);

		// Organized structure: images/{sessionId}/{personaId}/{timestamp}-{randomId}.{ext}
		const sessionPath = sessionId ? `${sessionId}/` : '';
		return `images/${sessionPath}${personaId}/${timestamp}-${randomId}.${extension}`;
	}

	/**
	 * Convert base64 to ArrayBuffer for R2 upload
	 */
	base64ToArrayBuffer(base64: string): ArrayBuffer {
		const binaryString = atob(base64);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		return bytes.buffer;
	}

	/**
	 * Get content type from file extension
	 */
	getContentType(extension: string): string {
		const typeMap: Record<string, string> = {
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			png: 'image/png',
			webp: 'image/webp',
			gif: 'image/gif',
			svg: 'image/svg+xml',
			bmp: 'image/bmp',
			tiff: 'image/tiff'
		};
		return typeMap[extension.toLowerCase()] || 'image/jpeg';
	}

	/**
	 * Batch upload multiple images
	 */
	async batchUploadImages(
		images: Array<{ data: ArrayBuffer | string; key: string; options?: ImageUploadOptions }>
	): Promise<BatchUploadResult> {
		const results: BatchUploadResult = {
			successful: [],
			failed: []
		};

		// Upload images concurrently with concurrency limit
		const concurrencyLimit = 5;
		const chunks = this.chunkArray(images, concurrencyLimit);

		for (const chunk of chunks) {
			const promises = chunk.map(async (image) => {
				try {
					const result = await this.uploadImage(image.data, image.key, image.options);
					results.successful.push(result);
				} catch (error) {
					results.failed.push({
						key: image.key,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
				}
			});

			await Promise.all(promises);
		}

		console.log(
			`📊 Batch upload complete: ${results.successful.length} successful, ${results.failed.length} failed`
		);
		return results;
	}

	/**
	 * Upload image from URL directly to R2
	 */
	async uploadImageFromUrl(
		imageUrl: string,
		key: string,
		options: ImageUploadOptions = {}
	): Promise<ImageUploadResult> {
		try {
			console.log(`⬇️ Downloading image from: ${imageUrl.substring(0, 50)}...`);

			const response = await fetch(imageUrl);
			if (!response.ok) {
				throw new Error(`Failed to download image: ${response.status}`);
			}

			const contentType = response.headers.get('content-type');
			if (!contentType?.startsWith('image/')) {
				throw new Error('URL does not point to a valid image');
			}

			const imageBuffer = await response.arrayBuffer();

			// Use detected content type if not provided
			const uploadOptions = {
				...options,
				contentType: options.contentType || contentType
			};

			return await this.uploadImage(imageBuffer, key, uploadOptions);
		} catch (error) {
			console.error('❌ Failed to upload image from URL:', error);
			throw new Error(
				`Upload from URL failed for '${imageUrl}': ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Get image metadata without downloading the full image
	 */
	async getImageMetadata(key: string): Promise<ImageMetadata | null> {
		try {
			const object = await this.bucket.head(key);

			if (!object) {
				return null;
			}

			return {
				personaId: object.customMetadata?.personaId || '',
				sessionId: object.customMetadata?.sessionId,
				participantId: object.customMetadata?.participantId,
				prompt: object.customMetadata?.prompt || '',
				provider: object.customMetadata?.provider || '',
				generatedAt: object.customMetadata?.generatedAt || '',
				size: object.size ? this.formatBytes(object.size) : '0 Bytes',
				quality: object.customMetadata?.quality
			};
		} catch (error) {
			console.error('❌ Failed to get image metadata:', error);
			return null;
		}
	}

	/**
	 * Validate upload inputs
	 */
	private validateUploadInputs(
		imageData: ArrayBuffer | string,
		key: string,
		options: ImageUploadOptions
	): StorageValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Validate image data
		if (!imageData) {
			errors.push('Image data is required');
		} else if (typeof imageData === 'string' && imageData.length === 0) {
			errors.push('Image data string is empty');
		} else if (imageData instanceof ArrayBuffer && imageData.byteLength === 0) {
			errors.push('Image data buffer is empty');
		}

		// Validate key
		if (!key || typeof key !== 'string') {
			errors.push('Valid key is required');
		} else if (key.length > 1024) {
			errors.push('Key is too long (max 1024 characters)');
		} else if (!this.isValidKey(key)) {
			errors.push('Key contains invalid characters');
		}

		// Validate content type
		if (options.contentType && !this.isValidContentType(options.contentType)) {
			warnings.push('Content type may not be a valid image type');
		}

		// Check file size (warn if over 10MB)
		const size =
			typeof imageData === 'string'
				? Math.ceil(imageData.length * 0.75) // Rough estimate for base64
				: imageData.byteLength;

		if (size > 10 * 1024 * 1024) {
			// 10MB
			warnings.push('Image size is over 10MB, may impact performance');
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings
		};
	}

	/**
	 * Check if key is valid
	 */
	private isValidKey(key: string): boolean {
		// Keys should not contain certain characters and should be reasonable length
		const invalidChars = /[<>:"|?*\x00-\x1f]/;
		return !invalidChars.test(key) && key.length > 0 && key.length <= 1024;
	}

	/**
	 * Check if content type is valid for images
	 */
	private isValidContentType(contentType: string): boolean {
		const validTypes = [
			'image/jpeg',
			'image/jpg',
			'image/png',
			'image/webp',
			'image/gif',
			'image/svg+xml',
			'image/bmp',
			'image/tiff'
		];
		return validTypes.includes(contentType.toLowerCase());
	}

	/**
	 * Detect content type from file extension
	 */
	private detectContentType(key: string): string {
		const extension = key.split('.').pop()?.toLowerCase();
		return this.getContentType(extension || 'jpg');
	}

	/**
	 * Format bytes for display
	 */
	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	/**
	 * Chunk array into smaller arrays
	 */
	private chunkArray<T>(array: T[], chunkSize: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += chunkSize) {
			chunks.push(array.slice(i, i + chunkSize));
		}
		return chunks;
	}
}
