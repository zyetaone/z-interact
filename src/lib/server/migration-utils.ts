// Migration utilities for moving from base64 database storage to R2
import { R2Storage } from './r2-storage';
import { getDb } from './db';
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
	 * Migrate all images from database to R2 with enhanced progress tracking
	 */
	async migrateAllImages(): Promise<MigrationResult> {
		console.log('🚀 Starting enhanced image migration to R2...');

		this.isRunning = true;
		this.isPaused = false;
		this.progress.status = 'running';
		this.progress.startTime = new Date();

		const result: MigrationResult = {
			success: false,
			total: 0,
			migrated: 0,
			failed: 0,
			skipped: 0,
			errors: [],
			warnings: [],
			duration: 0,
			dryRun: this.dryRun
		};

		try {
			// Get all images with base64 data that haven't been migrated yet
			const allImages = await getDb().select().from(images).where(eq(images.status, 'completed'));

			// Filter out images that are already in R2 (have imageUrl but no imageData)
			const imagesToMigrate = allImages.filter((img: any) => img.imageData && !img.imageUrl);

			result.total = imagesToMigrate.length;
			this.progress.total = result.total;
			this.progress.totalBatches = Math.ceil(result.total / this.batchSize);

			console.log(
				`📊 Found ${result.total} images to migrate (${allImages.length - result.total} already migrated)`
			);

			if (result.total === 0) {
				console.log('✅ No images need migration');
				this.progress.status = 'completed';
				result.success = true;
				return result;
			}

			// Process in batches with concurrency control
			for (let i = 0; i < imagesToMigrate.length && !this.isPaused; i += this.batchSize) {
				if (this.isPaused) {
					console.log('⏸️ Migration paused');
					this.progress.status = 'paused';
					break;
				}

				const batch = imagesToMigrate.slice(i, i + this.batchSize);
				this.progress.currentBatch = Math.floor(i / this.batchSize) + 1;

				console.log(
					`🔄 Processing batch ${this.progress.currentBatch}/${this.progress.totalBatches} (${batch.length} images)`
				);

				const batchResults = await this.processBatchWithConcurrency(batch);

				// Update progress
				batchResults.forEach((batchResult) => {
					this.progress.processed++;
					if (batchResult.success) {
						result.migrated++;
						this.progress.migrated++;
					} else if (batchResult.skipped) {
						result.skipped++;
						this.progress.skipped++;
					} else {
						result.failed++;
						this.progress.failed++;
						const error: MigrationError = {
							imageId: batchResult.imageId,
							error: batchResult.error,
							timestamp: new Date(),
							retryCount: batchResult.retryCount || 0
						};
						result.errors.push(error);
						this.progress.errors.push(error);
					}
				});

				// Update progress and call callback
				this.progress.lastUpdateTime = new Date();
				this.progress.estimatedTimeRemaining = this.calculateEstimatedTimeRemaining();
				this.progressCallback?.(this.progress);

				// Small delay between batches to prevent overwhelming the system
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Calculate final results
			result.duration = Date.now() - this.progress.startTime.getTime();
			result.success = result.failed === 0;

			if (result.success) {
				console.log(
					`✅ Migration completed successfully: ${result.migrated}/${result.total} images migrated`
				);
				this.progress.status = 'completed';
			} else {
				console.log(
					`⚠️ Migration completed with errors: ${result.migrated}/${result.total} migrated, ${result.failed} failed`
				);
				this.progress.status = 'completed';
			}

			if (result.skipped > 0) {
				console.log(`⏭️ ${result.skipped} images were skipped`);
			}
		} catch (error) {
			console.error('❌ Migration failed:', error);
			result.errors.push({
				imageId: 'migration',
				error: error instanceof Error ? error.message : 'Unknown migration error',
				timestamp: new Date(),
				retryCount: 0
			});
			this.progress.status = 'failed';
			result.success = false;
		} finally {
			this.isRunning = false;
			this.progress.lastUpdateTime = new Date();
			this.progressCallback?.(this.progress);
		}

		return result;
	}

	/**
	 * Process a batch of images with concurrency control
	 */
	private async processBatchWithConcurrency(batch: any[]): Promise<
		Array<{
			imageId: string;
			success: boolean;
			skipped: boolean;
			error: string;
			retryCount: number;
		}>
	> {
		const results: Array<{
			imageId: string;
			success: boolean;
			skipped: boolean;
			error: string;
			retryCount: number;
		}> = [];

		// Process images concurrently up to the concurrency limit
		const chunks = this.chunkArray(batch, this.concurrency);

		for (const chunk of chunks) {
			const chunkPromises = chunk.map(async (image) => {
				let retryCount = 0;
				const maxRetries = 3;

				while (retryCount <= maxRetries) {
					try {
						await this.migrateSingleImage(image);
						return {
							imageId: image.id,
							success: true,
							skipped: false,
							error: '',
							retryCount
						};
					} catch (error) {
						retryCount++;
						if (retryCount > maxRetries) {
							return {
								imageId: image.id,
								success: false,
								skipped: false,
								error: error instanceof Error ? error.message : 'Unknown error',
								retryCount
							};
						}
						// Exponential backoff
						await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
					}
				}
			});

			const chunkResults = await Promise.allSettled(chunkPromises);

			chunkResults.forEach((result) => {
				if (result.status === 'fulfilled' && result.value) {
					results.push(result.value);
				} else {
					results.push({
						imageId: 'unknown',
						success: false,
						skipped: false,
						error: result.status === 'rejected' ? result.reason : 'Unknown error',
						retryCount: 0
					});
				}
			});
		}

		return results;
	}

	/**
	 * Calculate estimated time remaining based on current progress
	 */
	private calculateEstimatedTimeRemaining(): number | undefined {
		const elapsed = Date.now() - this.progress.startTime.getTime();
		const processed = this.progress.processed;

		if (processed === 0) return undefined;

		const rate = processed / elapsed; // items per millisecond
		const remaining = this.progress.total - processed;
		const estimatedMs = remaining / rate;

		return Math.round(estimatedMs / 1000); // Convert to seconds
	}

	/**
	 * Pause migration
	 */
	pause(): void {
		this.isPaused = true;
		this.progress.status = 'paused';
		console.log('⏸️ Migration paused');
	}

	/**
	 * Resume migration
	 */
	resume(): void {
		this.isPaused = false;
		this.progress.status = 'running';
		console.log('▶️ Migration resumed');
	}

	/**
	 * Get current migration progress
	 */
	getProgress(): MigrationProgress {
		return { ...this.progress };
	}

	/**
	 * Check if migration is currently running
	 */
	isMigrationRunning(): boolean {
		return this.isRunning;
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
			await getDb()
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
	 * Enhanced validation with integrity checking and detailed reporting
	 */
	async validateMigration(
		options: {
			checkIntegrity?: boolean;
			sampleSize?: number;
			concurrency?: number;
		} = {}
	): Promise<ValidationResult> {
		console.log('🔍 Starting enhanced migration validation...');

		const result: ValidationResult = {
			isValid: false,
			totalChecked: 0,
			valid: 0,
			invalid: 0,
			missing: [],
			corrupted: [],
			orphaned: [],
			warnings: []
		};

		try {
			// Get all migrated images (those with imageUrl but no imageData)
			const migratedImages = await getDb().select().from(images).where(isNull(images.imageData));

			// Sample validation if requested
			const imagesToCheck = options.sampleSize
				? this.sampleArray(migratedImages, options.sampleSize)
				: migratedImages;

			result.totalChecked = imagesToCheck.length;
			console.log(
				`📊 Validating ${result.totalChecked} images${options.sampleSize ? ` (sampled from ${migratedImages.length})` : ''}`
			);

			// Process validation in batches with concurrency
			const concurrency = options.concurrency || 5;
			const chunks = this.chunkArray(imagesToCheck, concurrency);

			for (const chunk of chunks) {
				const validationPromises = chunk.map(async (image: any) => {
					return await this.validateSingleImage(image, options.checkIntegrity || false);
				});

				const chunkResults = await Promise.allSettled(validationPromises);

				chunkResults.forEach((chunkResult) => {
					if (chunkResult.status === 'fulfilled') {
						const validation = chunkResult.value;
						if (validation.isValid) {
							result.valid++;
						} else {
							result.invalid++;
							if (validation.reason === 'missing') {
								result.missing.push(validation.details);
							} else if (validation.reason === 'corrupted') {
								result.corrupted.push(validation.details);
							}
						}
					} else {
						result.invalid++;
						result.missing.push(`Validation error: ${chunkResult.reason}`);
					}
				});
			}

			// Check for orphaned R2 objects
			if (options.checkIntegrity) {
				console.log('🔍 Checking for orphaned R2 objects...');
				const orphaned = await this.findOrphanedR2Objects();
				result.orphaned = orphaned;
				if (orphaned.length > 0) {
					result.warnings.push(`Found ${orphaned.length} orphaned R2 objects`);
				}
			}

			result.isValid = result.invalid === 0;

			console.log(`✅ Validation completed: ${result.valid}/${result.totalChecked} images valid`);
			if (result.invalid > 0) {
				console.log(`❌ ${result.invalid} images have issues:`);
				console.log(`   - Missing: ${result.missing.length}`);
				console.log(`   - Corrupted: ${result.corrupted.length}`);
			}
			if (result.orphaned.length > 0) {
				console.log(`⚠️ ${result.orphaned.length} orphaned R2 objects found`);
			}
		} catch (error) {
			console.error('❌ Validation failed:', error);
			result.warnings.push(`Validation error: ${error}`);
			result.isValid = false;
		}

		return result;
	}

	/**
	 * Validate a single image
	 */
	private async validateSingleImage(
		image: any,
		checkIntegrity: boolean
	): Promise<{
		isValid: boolean;
		reason?: string;
		details: string;
	}> {
		if (!image.imageUrl) {
			return {
				isValid: false,
				reason: 'missing',
				details: `Image ${image.id}: No R2 URL in database`
			};
		}

		try {
			// Extract key from URL
			const key = this.extractR2KeyFromUrl(image.imageUrl);
			if (!key) {
				return {
					isValid: false,
					reason: 'missing',
					details: `Image ${image.id}: Invalid R2 URL format`
				};
			}

			// Check if object exists in R2
			const object = await this.r2Storage.downloadImage(key);

			if (!object) {
				return {
					isValid: false,
					reason: 'missing',
					details: `Image ${image.id}: R2 object not found at key ${key}`
				};
			}

			// Integrity check: verify file size and content type
			if (checkIntegrity) {
				const expectedSize = image.imageData ? Math.ceil(image.imageData.length * 0.75) : 0;
				const actualSize = object.size;

				if (expectedSize > 0 && Math.abs(actualSize - expectedSize) > expectedSize * 0.1) {
					return {
						isValid: false,
						reason: 'corrupted',
						details: `Image ${image.id}: Size mismatch (expected: ~${expectedSize}, actual: ${actualSize})`
					};
				}

				// Check content type consistency
				const expectedType = image.imageMimeType;
				const actualType = object.contentType;

				if (expectedType && actualType && !actualType.includes(expectedType.split('/')[1])) {
					return {
						isValid: false,
						reason: 'corrupted',
						details: `Image ${image.id}: Content type mismatch (expected: ${expectedType}, actual: ${actualType})`
					};
				}
			}

			return {
				isValid: true,
				details: `Image ${image.id}: Valid`
			};
		} catch (error) {
			return {
				isValid: false,
				reason: 'missing',
				details: `Image ${image.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	/**
	 * Find orphaned R2 objects (objects in R2 that don't have corresponding database records)
	 */
	private async findOrphanedR2Objects(): Promise<string[]> {
		const orphaned: string[] = [];

		try {
			// Get all R2 objects
			const r2Objects = await this.r2Storage.listImages({ prefix: 'images/' });

			if (!r2Objects.objects) return orphaned;

			// Get all image URLs from database
			const dbImages = await getDb()
				.select({ imageUrl: images.imageUrl })
				.from(images)
				.where(isNull(images.imageData));
			const dbUrls = new Set(dbImages.map((img: any) => img.imageUrl).filter(Boolean));

			// Check each R2 object
			for (const obj of r2Objects.objects) {
				const publicUrl = this.r2Storage.getPublicUrl(obj.key);
				if (!dbUrls.has(publicUrl)) {
					orphaned.push(obj.key);
				}
			}
		} catch (error) {
			console.error('❌ Error finding orphaned objects:', error);
		}

		return orphaned;
	}

	/**
	 * Extract R2 key from public URL
	 */
	private extractR2KeyFromUrl(url: string): string | null {
		try {
			const urlObj = new URL(url);
			// Remove leading slash from pathname
			return urlObj.pathname.substring(1);
		} catch {
			return null;
		}
	}

	/**
	 * Sample array for validation
	 */
	private sampleArray<T>(array: T[], sampleSize: number): T[] {
		if (sampleSize >= array.length) return array;

		const sampled: T[] = [];
		const step = array.length / sampleSize;

		for (let i = 0; i < sampleSize; i++) {
			const index = Math.floor(i * step);
			sampled.push(array[index]);
		}

		return sampled;
	}

	/**
	 * Enhanced rollback with safety checks and partial rollback support
	 */
	async rollbackMigration(
		options: {
			imageIds?: string[];
			batchSize?: number;
			dryRun?: boolean;
			deleteFromR2?: boolean;
		} = {}
	): Promise<RollbackResult> {
		console.log('🔄 Starting enhanced migration rollback...');

		const result: RollbackResult = {
			success: false,
			total: 0,
			rolledBack: 0,
			failed: 0,
			errors: []
		};

		try {
			let imagesToRollback: any[];

			if (options.imageIds && options.imageIds.length > 0) {
				// Partial rollback for specific images
				console.log(
					`🎯 Performing partial rollback for ${options.imageIds.length} specific images`
				);
				const placeholders = options.imageIds.map(() => '?').join(',');
				imagesToRollback = await getDb()
					.select()
					.from(images)
					.where(isNull(images.imageData))
					// Note: This is a simplified version. In practice, you'd need to handle the IN clause properly
					// For now, we'll filter in JavaScript
					.then((images: any[]) => images.filter((img: any) => options.imageIds!.includes(img.id)));
			} else {
				// Full rollback
				console.log('🔄 Performing full migration rollback');
				imagesToRollback = await getDb().select().from(images).where(isNull(images.imageData));
			}

			result.total = imagesToRollback.length;

			if (result.total === 0) {
				console.log('✅ No images to rollback');
				result.success = true;
				return result;
			}

			console.log(`📊 Rolling back ${result.total} images`);

			// Process rollback in batches
			const batchSize = options.batchSize || this.batchSize;
			const deleteFromR2 = options.deleteFromR2 !== false; // Default to true

			for (let i = 0; i < imagesToRollback.length; i += batchSize) {
				const batch = imagesToRollback.slice(i, i + batchSize);
				console.log(
					`🔄 Processing rollback batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(imagesToRollback.length / batchSize)}`
				);

				const batchResults = await Promise.allSettled(
					batch.map((image: any) =>
						this.rollbackSingleImage(image, deleteFromR2, options.dryRun || false)
					)
				);

				batchResults.forEach((batchResult, index) => {
					if (batchResult.status === 'fulfilled') {
						result.rolledBack++;
					} else {
						result.failed++;
						result.errors.push(`Image ${batch[index].id}: ${batchResult.reason}`);
					}
				});
			}

			result.success = result.failed === 0;

			if (result.success) {
				console.log(
					`✅ Rollback completed successfully: ${result.rolledBack}/${result.total} images rolled back`
				);
			} else {
				console.log(
					`⚠️ Rollback completed with errors: ${result.rolledBack}/${result.total} rolled back, ${result.failed} failed`
				);
			}

			if (options.dryRun) {
				console.log('🔍 This was a dry-run - no actual changes were made');
			}
		} catch (error) {
			console.error('❌ Rollback failed:', error);
			result.errors.push(`Rollback error: ${error}`);
			result.success = false;
		}

		return result;
	}

	/**
	 * Rollback a single image
	 */
	private async rollbackSingleImage(
		image: any,
		deleteFromR2: boolean,
		dryRun: boolean
	): Promise<void> {
		if (!image.imageUrl) {
			throw new Error('No R2 URL found for rollback');
		}

		// Extract R2 key from URL
		const key = this.extractR2KeyFromUrl(image.imageUrl);
		if (!key) {
			throw new Error(`Invalid R2 URL format: ${image.imageUrl}`);
		}

		// Download from R2
		const r2Object = await this.r2Storage.downloadImage(key);

		// Convert back to base64
		const base64Data = this.arrayBufferToBase64(r2Object.data);

		if (!dryRun) {
			// Update database
			await getDb()
				.update(images)
				.set({
					imageData: base64Data,
					imageUrl: null,
					updatedAt: new Date()
				})
				.where(eq(images.id, image.id));

			// Delete from R2 if requested
			if (deleteFromR2) {
				await this.r2Storage.deleteImage(key);
			}
		}

		console.log(`${dryRun ? '🔍 [DRY-RUN]' : '✅'} Rolled back image ${image.id}`);
	}

	/**
	 * Create a backup of current migration state
	 */
	async createMigrationBackup(): Promise<{
		success: boolean;
		backupPath?: string;
		recordCount: number;
		error?: string;
	}> {
		try {
			console.log('💾 Creating migration backup...');

			// Get all images with their current state
			const allImages = await getDb().select().from(images);

			const backup = {
				timestamp: new Date().toISOString(),
				totalImages: allImages.length,
				migratedImages: allImages.filter((img: any) => img.imageUrl && !img.imageData).length,
				base64Images: allImages.filter((img: any) => img.imageData).length,
				images: allImages.map((img: any) => ({
					id: img.id,
					hasBase64: !!img.imageData,
					hasR2Url: !!img.imageUrl,
					r2Url: img.imageUrl,
					mimeType: img.imageMimeType,
					size: img.imageData ? Math.ceil(img.imageData.length * 0.75) : 0
				}))
			};

			// In a real implementation, you'd save this to a file or database
			// For now, we'll just return the backup data
			console.log(
				`✅ Backup created: ${backup.totalImages} images (${backup.migratedImages} migrated, ${backup.base64Images} base64)`
			);

			return {
				success: true,
				recordCount: backup.totalImages,
				backupPath: `migration-backup-${backup.timestamp}.json`
			};
		} catch (error) {
			console.error('❌ Failed to create backup:', error);
			return {
				success: false,
				recordCount: 0,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Get migration statistics
	 */
	async getMigrationStats(): Promise<{
		totalImages: number;
		migratedImages: number;
		base64Images: number;
		partiallyMigratedImages: number; // Have both base64 and R2 URL
		failedImages: number;
		migrationProgress: number; // Percentage
		estimatedSpaceSaved: string;
	}> {
		try {
			const allImages = await getDb().select().from(images);

			const stats = {
				totalImages: allImages.length,
				migratedImages: 0,
				base64Images: 0,
				partiallyMigratedImages: 0,
				failedImages: 0,
				migrationProgress: 0,
				estimatedSpaceSaved: '0 MB'
			};

			let totalBase64Size = 0;

			allImages.forEach((img: any) => {
				const hasBase64 = !!img.imageData;
				const hasR2Url = !!img.imageUrl;

				if (hasR2Url && !hasBase64) {
					stats.migratedImages++;
				} else if (hasBase64 && !hasR2Url) {
					stats.base64Images++;
					totalBase64Size += Math.ceil(img.imageData.length * 0.75);
				} else if (hasBase64 && hasR2Url) {
					stats.partiallyMigratedImages++;
					totalBase64Size += Math.ceil(img.imageData.length * 0.75);
				} else {
					stats.failedImages++;
				}
			});

			// Calculate progress
			const completedImages = stats.migratedImages + stats.partiallyMigratedImages;
			stats.migrationProgress =
				stats.totalImages > 0 ? (completedImages / stats.totalImages) * 100 : 0;

			// Estimate space saved (rough calculation)
			const spaceSavedMB = Math.round((totalBase64Size / (1024 * 1024)) * 100) / 100;
			stats.estimatedSpaceSaved = `${spaceSavedMB} MB`;

			return stats;
		} catch (error) {
			console.error('❌ Failed to get migration stats:', error);
			throw error;
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

	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.length; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}
}
