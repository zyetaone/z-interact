import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export class ImageStorage {
	private storageDir = path.join(process.cwd(), 'static', 'images');

	async initialize() {
		try {
			await fs.mkdir(this.storageDir, { recursive: true });
			console.log('📁 Image storage directory created:', this.storageDir);
		} catch (error) {
			console.error('❌ Failed to create image storage directory:', error);
		}
	}

	async downloadAndStoreImage(imageUrl: string, filename?: string): Promise<string> {
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
			const finalFilename = filename || `${randomUUID()}.${extension}`;
			const filePath = path.join(this.storageDir, finalFilename);

			await fs.writeFile(filePath, Buffer.from(imageBuffer));
			console.log('✅ Image saved to:', filePath);

			// Return the public URL
			return `/images/${finalFilename}`;

		} catch (error) {
			console.error('❌ Failed to download and store image:', error);
			throw error;
		}
	}

	async deleteImage(filename: string): Promise<boolean> {
		try {
			const filePath = path.join(this.storageDir, filename);
			await fs.unlink(filePath);
			console.log('🗑️ Image deleted:', filename);
			return true;
		} catch (error) {
			console.error('❌ Failed to delete image:', error);
			return false;
		}
	}

	async listImages(): Promise<string[]> {
		try {
			const files = await fs.readdir(this.storageDir);
			return files.filter(file => {
				const ext = path.extname(file).toLowerCase();
				return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
			});
		} catch (error) {
			console.error('❌ Failed to list images:', error);
			return [];
		}
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

	// Clean up expired images (older than specified days)
	async cleanupExpiredImages(maxAgeDays: number = 30): Promise<number> {
		try {
			const files = await fs.readdir(this.storageDir);
			let deletedCount = 0;

			for (const file of files) {
				const filePath = path.join(this.storageDir, file);
				const stats = await fs.stat(filePath);

				const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

				if (ageInDays > maxAgeDays) {
					await fs.unlink(filePath);
					deletedCount++;
					console.log('🗑️ Cleaned up expired image:', file);
				}
			}

			console.log(`🧹 Cleaned up ${deletedCount} expired images`);
			return deletedCount;
		} catch (error) {
			console.error('❌ Failed to cleanup expired images:', error);
			return 0;
		}
	}
}

export const imageStorage = new ImageStorage();