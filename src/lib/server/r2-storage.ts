import type { Platform } from './db';

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
	 * @param imageUrl - The source image URL (e.g., from OpenAI)
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

			console.log('Downloading image from:', imageUrl);

			// Download the image from the source URL
			const response = await fetch(imageUrl);
			if (!response.ok) {
				throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
			}

			const imageBuffer = await response.arrayBuffer();
			const contentType = response.headers.get('content-type') || 'image/png';

			console.log('Uploading to R2 with filename:', filename);

			// Upload to R2 bucket
			const r2Object = await this.platform.env.R2_IMAGES.put(filename, imageBuffer, {
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

			console.log('Image uploaded successfully to:', publicUrl);

			return {
				success: true,
				url: publicUrl,
				key: filename
			};
		} catch (error) {
			console.error('R2 upload failed:', error);
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

			console.log('Converting base64 to buffer for:', filename);

			// Convert base64 to buffer
			const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

			console.log('Uploading to R2 with filename:', filename);

			// Upload to R2 bucket
			const r2Object = await this.platform.env.R2_IMAGES.put(filename, imageBuffer, {
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

			console.log('Image uploaded successfully to:', publicUrl);

			return {
				success: true,
				url: publicUrl,
				key: filename
			};
		} catch (error) {
			console.error('R2 upload failed:', error);
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

			await this.platform.env.R2_IMAGES.delete(filename);
			console.log('Image deleted from R2:', filename);
			return true;
		} catch (error) {
			console.error('Failed to delete from R2:', error);
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
