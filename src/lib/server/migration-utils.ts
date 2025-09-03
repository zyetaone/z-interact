// Migration utilities for moving from base64 database storage to R2
import { R2Storage } from './r2-storage';
import { db } from './db';
import { images } from './db/schema';
import { eq, isNull } from 'drizzle-orm';

export interface MigrationConfig {
	r2Storage: R2Storage;
	batchSize?: number;
	dryRun?: boolean;
	concurrency?: number;
	progressCallback?: (progress: MigrationProgress) => void;
}

export interface MigrationProgress {
	total: number;
	processed: number;
	migrated: number;
	failed: number;
	skipped: number;
	currentBatch: number;
	totalBatches: number;
	estimatedTimeRemaining?: number;
	startTime: Date;
	lastUpdateTime: Date;
	status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'rollback';
	errors: MigrationError[];
	warnings: string[];
}

export interface MigrationError {
	imageId: string;
	error: string;
	timestamp: Date;
	retryCount: number;
}

export interface MigrationResult {
	success: boolean;
	total: number;
	migrated: number;
	failed: number;
	skipped: number;
	errors: MigrationError[];
	warnings: string[];
	duration: number;
	dryRun: boolean;
}

export interface ValidationResult {
	isValid: boolean;
	totalChecked: number;
	valid: number;
	invalid: number;
	missing: string[];
	corrupted: string[];
	orphaned: string[];
	warnings: string[];
}

export interface RollbackResult {
	success: boolean;
	total: number;
	rolledBack: number;
	failed: number;
	errors: string[];
}

export class ImageMigrationService {
	private r2Storage: R2Storage;
	private batchSize: number;
	private dryRun: boolean;
	private concurrency: number;
	private progressCallback?: (progress: MigrationProgress) => void;
	private progress: MigrationProgress;
	private isRunning: boolean = false;
	private isPaused: boolean = false;

	constructor(config: MigrationConfig) {
		this.r2Storage = config.r2Storage;
		this.batchSize = config.batchSize || 10;
		this.dryRun = config.dryRun || false;
		this.concurrency = config.concurrency || 3;
		this.progressCallback = config.progressCallback;

		this.progress = {
			total: 0,
			processed: 0,
			migrated: 0,
			failed: 0,
			skipped: 0,
			currentBatch: 0,
			totalBatches: 0,
			startTime: new Date(),
			lastUpdateTime: new Date(),
			status: 'idle',
			errors: [],
			warnings: []
		};
	}

	/**
	 * Migrate all images from database to R2
	 */
	async migrateAllImages(): Promise<{
		total: number;
		migrated: number;
		failed: number;
		errors: string[];
	}> {
		console.log('🚀 Starting image migration to R2...');

		const result = {
			total: 0,
			migrated: 0,
			failed: 0,
			errors: [] as string[]
		};

		try {
			// Get all images with base64 data
			const allImages = await db.select().from(images).where(eq(images.status, 'completed'));

			result.total = allImages.length;
			console.log(`📊 Found ${result.total} images to migrate`);

			// Process in batches
			for (let i = 0; i < allImages.length; i += this.batchSize) {
				const batch = allImages.slice(i, i + this.batchSize);
				console.log(
					`🔄 Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(allImages.length / this.batchSize)}`
				);

				const batchResults = await Promise.allSettled(
					batch.map((image) => this.migrateSingleImage(image))
				);

				batchResults.forEach((batchResult, index) => {
					if (batchResult.status === 'fulfilled') {
						result.migrated++;
					} else {
						result.failed++;
						result.errors.push(`Image ${batch[index].id}: ${batchResult.reason}`);
					}
				});
			}

			console.log(`✅ Migration completed: ${result.migrated}/${result.total} images migrated`);
			if (result.failed > 0) {
				console.log(`❌ ${result.failed} images failed to migrate`);
			}
		} catch (error) {
			console.error('❌ Migration failed:', error);
			result.errors.push(`Migration error: ${error}`);
		}

		return result;
	}

	/**
	 * Migrate a single image
	 */
	private async migrateSingleImage(image: any): Promise<void> {
		if (!image.imageData) {
			throw new Error('No base64 data found');
		}

		// Generate R2 key
		const extension = this.getExtensionFromMimeType(image.imageMimeType || 'image/jpeg');
		const r2Key = this.r2Storage.generateImageKey(image.personaId, extension);

		// Convert base64 to ArrayBuffer
		const imageBuffer = this.r2Storage.base64ToArrayBuffer(image.imageData);

		// Upload to R2
		if (!this.dryRun) {
			await this.r2Storage.uploadImage(imageBuffer, r2Key, {
				contentType: image.imageMimeType || 'image/jpeg',
				customMetadata: {
					originalId: image.id,
					personaId: image.personaId,
					sessionId: image.sessionId || '',
					participantId: image.participantId || '',
					prompt: image.prompt,
					provider: image.provider
				}
			});

			// Update database with R2 URL
			await db
				.update(images)
				.set({
					imageUrl: this.r2Storage.getPublicUrl(r2Key),
					imageData: null, // Clear base64 data
					updatedAt: new Date()
				})
				.where(eq(images.id, image.id));
		}

		console.log(`✅ Migrated image ${image.id} to R2: ${r2Key}`);
	}

	/**
	 * Validate migration by checking R2 objects exist
	 */
	async validateMigration(): Promise<{
		total: number;
		valid: number;
		invalid: number;
		missing: string[];
	}> {
		console.log('🔍 Validating migration...');

		const result = {
			total: 0,
			valid: 0,
			invalid: 0,
			missing: [] as string[]
		};

		try {
			// Get all migrated images (those with imageUrl but no imageData)
			const migratedImages = await db.select().from(images).where(isNull(images.imageData));

			result.total = migratedImages.length;

			for (const image of migratedImages) {
				if (!image.imageUrl) {
					result.invalid++;
					result.missing.push(`Image ${image.id}: No R2 URL`);
					continue;
				}

				try {
					// Extract key from URL
					const urlParts = image.imageUrl.split('/');
					const key = urlParts.slice(-3).join('/'); // images/personaId/timestamp-random.ext

					// Check if object exists in R2
					const object = await this.r2Storage.downloadImage(key);
					if (object) {
						result.valid++;
					} else {
						result.invalid++;
						result.missing.push(`Image ${image.id}: R2 object not found`);
					}
				} catch (error) {
					result.invalid++;
					result.missing.push(`Image ${image.id}: ${error}`);
				}
			}

			console.log(`✅ Validation completed: ${result.valid}/${result.total} images valid`);
		} catch (error) {
			console.error('❌ Validation failed:', error);
		}

		return result;
	}

	/**
	 * Rollback migration (move images back to database)
	 */
	async rollbackMigration(): Promise<{
		total: number;
		rolledBack: number;
		failed: number;
	}> {
		console.log('🔄 Starting migration rollback...');

		const result = {
			total: 0,
			rolledBack: 0,
			failed: 0
		};

		try {
			// Get all migrated images
			const migratedImages = await db.select().from(images).where(isNull(images.imageData));

			result.total = migratedImages.length;

			for (const image of migratedImages) {
				try {
					// Download from R2
					const urlParts = image.imageUrl!.split('/');
					const key = urlParts.slice(-3).join('/');
					const r2Object = await this.r2Storage.downloadImage(key);

					// Convert back to base64
					const base64Data = this.arrayBufferToBase64(r2Object.data);

					// Update database
					await db
						.update(images)
						.set({
							imageData: base64Data,
							imageUrl: null,
							updatedAt: new Date()
						})
						.where(eq(images.id, image.id));

					// Delete from R2
					await this.r2Storage.deleteImage(key);

					result.rolledBack++;
					console.log(`✅ Rolled back image ${image.id}`);
				} catch (error) {
					result.failed++;
					console.error(`❌ Failed to rollback image ${image.id}:`, error);
				}
			}

			console.log(`✅ Rollback completed: ${result.rolledBack}/${result.total} images rolled back`);
		} catch (error) {
			console.error('❌ Rollback failed:', error);
		}

		return result;
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

	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.length; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}
}
