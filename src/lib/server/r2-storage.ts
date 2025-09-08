import type { Platform } from '$lib/types';
import { logger, devLog } from '$lib/utils/logger';

export interface R2UploadResult {
	success: boolean;
	url?: string;
	key?: string;
	error?: string;
}

export class R2Storage {
	private platform: Platform;

	constructor(platform: Platform) {
		this.platform = platform;
	}

	/**
	 * Upload an image to R2 storage from a URL
	 * @param imageUrl - The source image URL (e.g., from Fal.ai)
	 * @param filename - The desired filename for the stored image
	 * @returns R2UploadResult with the permanent URL
	 */
	async uploadImageFromUrl(imageUrl: string, filename: string): Promise<R2UploadResult> {
		try {
			// Check if R2 is configured
			if (!this.platform?.env?.R2_IMAGES) {
				throw new Error('R2_IMAGES bucket not configured');
			}

			if (!this.platform?.env?.R2_PUBLIC_URL) {
				throw new Error('R2_PUBLIC_URL not configured');
			}

			devLog('Downloading image from URL', {
				component: 'R2Storage',
				operation: 'upload_from_url',
				url: imageUrl?.substring(0, 50),
				filename
			});

			// Download the image from the source URL
			const response = await fetch(imageUrl);
			if (!response.ok) {
				throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
			}

			const imageBuffer = await response.arrayBuffer();
			const contentType = response.headers.get('content-type') || 'image/png';

			devLog('Uploading to R2 bucket', {
				component: 'R2Storage',
				operation: 'upload_from_url',
				filename,
				size: imageBuffer.byteLength
			});

			// Upload to R2 bucket
			const r2Object = await (this.platform.env.R2_IMAGES as any).put(filename, imageBuffer, {
				httpMetadata: {
					contentType,
					cacheControl: 'public, max-age=31536000' // Cache for 1 year
				},
				customMetadata: {
					uploadedAt: new Date().toISOString(),
					originalUrl: imageUrl
				}
			});

			if (!r2Object) {
				throw new Error('Failed to upload to R2 bucket');
			}

			// Construct the public URL
			const publicUrl = `${this.platform.env.R2_PUBLIC_URL}/${filename}`;

			devLog('Image uploaded successfully', {
				component: 'R2Storage',
				operation: 'upload_from_url',
				publicUrl
			});

			return {
				success: true,
				url: publicUrl,
				key: filename
			};
		} catch (error) {
			logger.error(
				'R2 upload from URL failed',
				{
					component: 'R2Storage',
					operation: 'upload_from_url'
				},
				error instanceof Error ? error : new Error(String(error))
			);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Upload an image to R2 storage from base64 data
	 * @param base64Data - The base64 encoded image data (without data:image prefix)
	 * @param filename - The desired filename for the stored image
	 * @returns R2UploadResult with the permanent URL
	 */
	async uploadImageFromBase64(base64Data: string, filename: string): Promise<R2UploadResult> {
		try {
			// Check if R2 is configured
			if (!this.platform?.env?.R2_IMAGES) {
				throw new Error('R2_IMAGES bucket not configured');
			}

			if (!this.platform?.env?.R2_PUBLIC_URL) {
				throw new Error('R2_PUBLIC_URL not configured');
			}

			devLog('Converting base64 to buffer', {
				component: 'R2Storage',
				operation: 'upload_from_base64',
				filename,
				dataSize: base64Data.length
			});

			// Convert base64 to buffer
			const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

			devLog('Uploading base64 data to R2', {
				component: 'R2Storage',
				operation: 'upload_from_base64',
				filename,
				bufferSize: imageBuffer.length
			});

			// Upload to R2 bucket
			const r2Object = await (this.platform.env.R2_IMAGES as any).put(filename, imageBuffer, {
				httpMetadata: {
					contentType: 'image/png',
					cacheControl: 'public, max-age=31536000' // Cache for 1 year
				},
				customMetadata: {
					uploadedAt: new Date().toISOString(),
					source: 'base64'
				}
			});

			if (!r2Object) {
				throw new Error('Failed to upload to R2 bucket');
			}

			// Construct the public URL
			const publicUrl = `${this.platform.env.R2_PUBLIC_URL}/${filename}`;

			devLog('Base64 image uploaded successfully', {
				component: 'R2Storage',
				operation: 'upload_from_base64',
				publicUrl
			});

			return {
				success: true,
				url: publicUrl,
				key: filename
			};
		} catch (error) {
			logger.error(
				'R2 upload from URL failed',
				{
					component: 'R2Storage',
					operation: 'upload_from_url'
				},
				error instanceof Error ? error : new Error(String(error))
			);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Upload an image to R2 storage from a buffer
	 * @param buffer - The image data as Uint8Array
	 * @param filename - The desired filename for the stored image
	 * @param contentType - The MIME type of the image
	 * @returns R2UploadResult with the permanent URL
	 */
	async uploadImageFromBuffer(
		buffer: Uint8Array,
		filename: string,
		contentType: string = 'image/png'
	): Promise<R2UploadResult> {
		try {
			// Check if R2 is configured
			if (!this.platform?.env?.R2_IMAGES) {
				throw new Error('R2_IMAGES bucket not configured');
			}

			if (!this.platform?.env?.R2_PUBLIC_URL) {
				throw new Error('R2_PUBLIC_URL not configured');
			}

			devLog('Uploading image buffer to R2', {
				component: 'R2Storage',
				operation: 'upload_from_buffer',
				filename,
				size: buffer.length
			});

			// Upload to R2
			const r2Bucket = this.platform.env.R2_IMAGES as any;
			const r2Object = await r2Bucket.put(filename, buffer, {
				httpMetadata: {
					contentType
				}
			});

			if (!r2Object) {
				throw new Error('Failed to upload to R2 bucket');
			}

			// Construct the public URL
			const publicUrl = `${this.platform.env.R2_PUBLIC_URL}/${filename}`;

			devLog('Buffer image uploaded successfully', {
				component: 'R2Storage',
				operation: 'upload_from_buffer',
				publicUrl
			});

			return {
				success: true,
				url: publicUrl,
				key: filename
			};
		} catch (error) {
			logger.error(
				'R2 upload from buffer failed',
				{
					component: 'R2Storage',
					operation: 'upload_from_buffer'
				},
				error instanceof Error ? error : new Error(String(error))
			);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Delete an image from R2 storage
	 * @param filename - The filename/key to delete
	 */
	async deleteImage(filename: string): Promise<boolean> {
		try {
			if (!this.platform?.env?.R2_IMAGES) {
				throw new Error('R2_IMAGES bucket not configured');
			}

			await (this.platform.env.R2_IMAGES as any).delete(filename);
			devLog('Image deleted from R2', {
				component: 'R2Storage',
				operation: 'delete_image',
				filename
			});
			return true;
		} catch (error) {
			logger.error(
				'Failed to delete from R2',
				{
					component: 'R2Storage',
					operation: 'delete_image',
					filename
				},
				error instanceof Error ? error : new Error(String(error))
			);
			return false;
		}
	}

	/**
	 * Generate a unique filename for an image
	 * @param personaId - The persona ID
	 * @param extension - File extension (default: png)
	 */
	static generateFilename(personaId: string, extension: string = 'png'): string {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		return `images/${personaId}/${timestamp}-${random}.${extension}`;
	}
}

export function createR2Storage(platform: Platform): R2Storage {
	return new R2Storage(platform);
}

// Helper to extract an R2 object key from a public URL
export function extractR2KeyFromUrl(publicBase: string, url: string): string | null {
	if (!publicBase || !url) return null;
	const base = publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase;
	if (!url.startsWith(base)) return null;
	let key = url.slice(base.length);
	if (key.startsWith('/')) key = key.slice(1);
	return key || null;
}
