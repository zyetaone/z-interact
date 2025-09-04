// R2 Storage Integration for z-interact
// This file demonstrates how to integrate the R2Storage service with the existing image generation workflow

import { R2Storage } from './r2-storage';
import type { R2StorageConfig, ImageUploadOptions, ImageMetadata } from './r2-storage';
import { imageGenerator } from './ai/image-generator';
import { getDb } from './db';
import { images } from './db/schema';
import { eq, isNull } from 'drizzle-orm';

export class R2StorageIntegration {
	private r2Storage: R2Storage;

	constructor(platform: any) {
		// Initialize R2 storage with platform bindings
		const config: R2StorageConfig = {
			bucket: platform?.env?.R2_IMAGES,
			publicUrl: platform?.env?.R2_PUBLIC_URL,
			accountId: platform?.env?.R2_ACCOUNT_ID,
			bucketName: platform?.env?.R2_BUCKET_NAME
		};

		this.r2Storage = new R2Storage(config);
	}

	/**
	 * Generate and store image using R2 storage
	 */
	async generateAndStoreImage(
		prompt: string,
		personaId: string,
		sessionId?: string,
		participantId?: string,
		size: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024',
		quality: 'standard' | 'hd' = 'standard'
	) {
		try {
			console.log(`🎨 Generating image for persona: ${personaId}`);

			// Generate image using AI service
			const result = await imageGenerator.generateImage({
				prompt,
				size,
				quality
			});

			console.log(`✅ Image generated: ${result.imageUrl.substring(0, 50)}...`);

			// Download and store in R2
			const extension = this.getExtensionFromUrl(result.imageUrl);
			const r2Key = this.r2Storage.generateImageKey(personaId, extension, sessionId);

			const uploadOptions: ImageUploadOptions = {
				contentType: `image/${extension}`,
				customMetadata: {
					personaId,
					sessionId: sessionId || '',
					participantId: participantId || '',
					prompt: result.prompt,
					provider: result.provider,
					generatedAt: new Date().toISOString(),
					size,
					quality,
					originalUrl: result.imageUrl
				}
			};

			const uploadResult = await this.r2Storage.uploadImageFromUrl(
				result.imageUrl,
				r2Key,
				uploadOptions
			);

			// Store metadata in database
			const imageRecord = await getDb()
				.insert(images)
				.values({
					sessionId,
					participantId,
					tableId: personaId, // Using personaId as tableId for compatibility
					personaId,
					personaTitle: this.getPersonaTitle(personaId),
					imageUrl: uploadResult.publicUrl, // Store R2 public URL
					imageData: null, // Not storing base64 when using R2
					imageMimeType: uploadOptions.contentType,
					prompt: result.prompt,
					provider: result.provider,
					status: 'completed',
					createdAt: new Date(),
					updatedAt: new Date()
				})
				.returning();

			console.log(`💾 Image stored in database with ID: ${imageRecord[0].id}`);
			console.log(`🔗 Public URL: ${uploadResult.publicUrl}`);

			return {
				imageId: imageRecord[0].id,
				publicUrl: uploadResult.publicUrl,
				r2Key: uploadResult.key,
				metadata: uploadResult.metadata,
				provider: result.provider,
				prompt: result.prompt
			};
		} catch (error) {
			console.error('❌ Failed to generate and store image:', error);

			// Store failed status in database
			await getDb()
				.insert(images)
				.values({
					sessionId,
					participantId,
					tableId: personaId,
					personaId,
					personaTitle: this.getPersonaTitle(personaId),
					imageUrl: null,
					imageData: null,
					imageMimeType: null,
					prompt,
					provider: 'placeholder',
					status: 'failed',
					createdAt: new Date(),
					updatedAt: new Date()
				});

			throw error;
		}
	}

	/**
	 * Get image by ID with R2 integration
	 */
	async getImageById(imageId: string) {
		try {
			const imageRecord = await getDb()
				.select()
				.from(images)
				.where(eq(images.id, imageId))
				.limit(1);

			if (!imageRecord.length) {
				throw new Error(`Image not found: ${imageId}`);
			}

			const image = imageRecord[0];

			// If image has R2 URL, return it directly
			if (
				(image.imageUrl && image.imageUrl.includes('r2.')) ||
				image.imageUrl?.includes('cloudflarestorage')
			) {
				return {
					id: image.id,
					url: image.imageUrl,
					mimeType: image.imageMimeType,
					metadata: await this.getImageMetadataFromUrl(image.imageUrl),
					storage: 'r2'
				};
			}

			// Fallback to base64 if available
			if (image.imageData) {
				return {
					id: image.id,
					url: `data:${image.imageMimeType};base64,${image.imageData}`,
					mimeType: image.imageMimeType,
					metadata: null,
					storage: 'base64'
				};
			}

			throw new Error(`No image data available for image: ${imageId}`);
		} catch (error) {
			console.error('❌ Failed to get image by ID:', error);
			throw error;
		}
	}

	/**
	 * Delete image from both R2 and database
	 */
	async deleteImage(imageId: string) {
		try {
			const imageRecord = await getDb()
				.select()
				.from(images)
				.where(eq(images.id, imageId))
				.limit(1);

			if (!imageRecord.length) {
				throw new Error(`Image not found: ${imageId}`);
			}

			const image = imageRecord[0];

			// Delete from R2 if it's an R2 URL
			if (
				image.imageUrl &&
				(image.imageUrl.includes('r2.') || image.imageUrl.includes('cloudflarestorage'))
			) {
				const r2Key = this.extractR2KeyFromUrl(image.imageUrl);
				if (r2Key) {
					await this.r2Storage.deleteImage(r2Key);
				}
			}

			// Delete from database
			await getDb().delete(images).where(eq(images.id, imageId));

			console.log(`🗑️ Image deleted: ${imageId}`);
			return true;
		} catch (error) {
			console.error('❌ Failed to delete image:', error);
			throw error;
		}
	}

	/**
	 * Migrate existing base64 images to R2 storage
	 */
	async migrateImageToR2(imageId: string) {
		try {
			const imageRecord = await getDb()
				.select()
				.from(images)
				.where(eq(images.id, imageId))
				.limit(1);

			if (!imageRecord.length) {
				throw new Error(`Image not found: ${imageId}`);
			}

			const image = imageRecord[0];

			// Skip if already in R2
			if (
				image.imageUrl &&
				(image.imageUrl.includes('r2.') || image.imageUrl.includes('cloudflarestorage'))
			) {
				console.log(`⏭️ Image already in R2: ${imageId}`);
				return { migrated: false, reason: 'Already in R2' };
			}

			// Skip if no base64 data
			if (!image.imageData) {
				throw new Error(`No base64 data available for migration: ${imageId}`);
			}

			// Generate R2 key
			const extension = this.getExtensionFromMimeType(image.imageMimeType || 'image/jpeg');
			const r2Key = this.r2Storage.generateImageKey(
				image.personaId,
				extension,
				image.sessionId || undefined
			);

			// Upload to R2
			const uploadOptions: ImageUploadOptions = {
				contentType: image.imageMimeType || 'image/jpeg',
				customMetadata: {
					personaId: image.personaId,
					sessionId: image.sessionId || '',
					participantId: image.participantId || '',
					prompt: image.prompt,
					provider: image.provider,
					generatedAt: image.createdAt.toISOString(),
					migratedAt: new Date().toISOString(),
					originalFormat: 'base64'
				}
			};

			const uploadResult = await this.r2Storage.uploadImage(image.imageData, r2Key, uploadOptions);

			// Update database record
			await getDb()
				.update(images)
				.set({
					imageUrl: uploadResult.publicUrl,
					imageData: null, // Clear base64 data to save space
					updatedAt: new Date()
				})
				.where(eq(images.id, imageId));

			console.log(`✅ Image migrated to R2: ${imageId} -> ${r2Key}`);
			return {
				migrated: true,
				r2Key: uploadResult.key,
				publicUrl: uploadResult.publicUrl
			};
		} catch (error) {
			console.error('❌ Failed to migrate image to R2:', error);
			throw error;
		}
	}

	/**
	 * Get storage statistics
	 */
	async getStorageStats() {
		try {
			const totalImages = await getDb().$count(images);
			const r2Images = await getDb().$count(images, isNull(images.imageData));
			const base64Images = totalImages - r2Images;

			const listResult = await this.r2Storage.listImages({ prefix: 'images/' });
			const r2Objects = listResult.objects || [];

			let totalR2Size = 0;
			r2Objects.forEach((obj: any) => {
				totalR2Size += obj.size || 0;
			});

			return {
				totalImages,
				r2Images,
				base64Images,
				r2ObjectsCount: r2Objects.length,
				totalR2Size,
				totalR2SizeFormatted: this.formatBytes(totalR2Size)
			};
		} catch (error) {
			console.error('❌ Failed to get storage stats:', error);
			throw error;
		}
	}

	// Helper methods

	private getExtensionFromUrl(url: string): string {
		try {
			const urlObj = new URL(url);
			const pathname = urlObj.pathname;
			const extension = pathname.split('.').pop()?.toLowerCase();
			return extension || 'jpg';
		} catch {
			return 'jpg';
		}
	}

	private getExtensionFromMimeType(mimeType: string): string {
		const typeMap: Record<string, string> = {
			'image/jpeg': 'jpg',
			'image/png': 'png',
			'image/webp': 'webp',
			'image/gif': 'gif'
		};
		return typeMap[mimeType] || 'jpg';
	}

	private getPersonaTitle(personaId: string): string {
		// This should be replaced with actual persona lookup
		const personaTitles: Record<string, string> = {
			'baby-boomer': 'Baby Boomer',
			'gen-x': 'Generation X',
			millennial: 'Millennial',
			'gen-z': 'Generation Z'
		};
		return personaTitles[personaId] || personaId;
	}

	private extractR2KeyFromUrl(url: string): string | null {
		try {
			const urlObj = new URL(url);
			// Remove leading slash and return the path
			return urlObj.pathname.substring(1);
		} catch {
			return null;
		}
	}

	private async getImageMetadataFromUrl(url: string): Promise<ImageMetadata | null> {
		try {
			const key = this.extractR2KeyFromUrl(url);
			if (!key) return null;
			return await this.r2Storage.getImageMetadata(key);
		} catch {
			return null;
		}
	}

	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
}

// Export singleton instance factory
export function createR2StorageIntegration(platform: any): R2StorageIntegration {
	return new R2StorageIntegration(platform);
}
