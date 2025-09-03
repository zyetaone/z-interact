// Cloudflare Workers compatible image storage
export class ImageStorage {
	async initialize() {
		// No filesystem initialization needed in Cloudflare Workers
		console.log('📁 Image storage initialized for Cloudflare Workers');
	}

	async downloadAndStoreImage(imageUrl: string, filename?: string): Promise<{
		url: string;
		data: string;
		mimeType: string;
	}> {
		try {
			console.log('⬇️ Downloading image from:', imageUrl.substring(0, 50) + '...');

			const response = await fetch(imageUrl);
			if (!response.ok) {
				throw new Error(`Failed to download image: ${response.status}`);
			}

			const contentType = response.headers.get('content-type');
			if (!contentType?.startsWith('image/')) {
				throw new Error('URL does not point to a valid image');
			}

			const imageBuffer = await response.arrayBuffer();
			const extension = this.getExtensionFromContentType(contentType);

			// Generate unique filename if not provided
			const finalFilename = filename || `${crypto.randomUUID()}.${extension}`;

			// Convert to base64 for database storage (no filesystem in Cloudflare Workers)
			const base64Data = this.arrayBufferToBase64(imageBuffer);

			console.log('✅ Image processed for storage');
			console.log('📊 Base64 data length:', base64Data.length);

			// Return data URL for immediate use and base64 for database storage
			return {
				url: `data:${contentType};base64,${base64Data}`,
				data: base64Data,
				mimeType: contentType
			};

		} catch (error) {
			console.error('❌ Failed to download and store image:', error);
			throw error;
		}
	}

	async deleteImage(filename: string): Promise<boolean> {
		// Images are stored in database, deletion handled by database operations
		console.log('🗑️ Image deletion handled by database operations');
		return true;
	}

	async listImages(): Promise<string[]> {
		// Images are stored in database, listing handled by database operations
		console.log('📋 Image listing handled by database operations');
		return [];
	}

	private getExtensionFromContentType(contentType: string): string {
		const typeMap: Record<string, string> = {
			'image/jpeg': 'jpg',
			'image/png': 'png',
			'image/webp': 'webp',
			'image/gif': 'gif',
		};

		return typeMap[contentType] || 'jpg';
	}

	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		const len = bytes.byteLength;
		for (let i = 0; i < len; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}

	// Clean up expired images (handled by database operations in Cloudflare Workers)
	async cleanupExpiredImages(maxAgeDays: number = 30): Promise<number> {
		console.log('🧹 Image cleanup handled by database operations');
		return 0;
	}
}

export const imageStorage = new ImageStorage();