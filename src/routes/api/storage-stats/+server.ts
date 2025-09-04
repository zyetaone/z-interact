import { getDb } from '$lib/server/db';
import { images } from '$lib/server/db/schema';
import { R2Storage } from '$lib/server/r2-storage';
import { isNull, isNotNull, and } from 'drizzle-orm';
import { withApiHandler } from '$lib/server/api-utils';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	return withApiHandler(
		event,
		async () => {
			const { platform } = event;
			const database = getDb();

			// Basic database statistics
			const totalImages = await database.$count(images);
			const r2Images = await database.$count(
				images,
				and(isNotNull(images.imageUrl), isNull(images.imageData))
			);
			const base64Images = await database.$count(
				images,
				and(isNotNull(images.imageData), isNull(images.imageUrl))
			);
			const mixedImages = totalImages - r2Images - base64Images;

			// R2 statistics (if enabled)
			let r2Stats = null;
			let r2Error = null;

			const enableR2 = platform?.env?.ENABLE_R2_STORAGE === 'true';
			const r2Configured = enableR2 && platform?.env?.R2_IMAGES;

			if (r2Configured) {
				try {
					const r2Storage = new R2Storage({
						bucket: platform.env.R2_IMAGES,
						publicUrl: platform.env.R2_PUBLIC_URL,
						accountId: platform.env.R2_ACCOUNT_ID,
						bucketName: platform.env.R2_BUCKET_NAME
					});

					// List objects with pagination
					const listResult = await r2Storage.listImages({
						prefix: 'images/',
						limit: 1000
					});

					const r2Objects = listResult.objects || [];
					let totalR2Size = 0;
					let r2ObjectCount = r2Objects.length;

					r2Objects.forEach((obj: any) => {
						totalR2Size += obj.size || 0;
					});

					// Check if there are more objects (for large buckets)
					const hasMore = listResult.truncated || false;

					r2Stats = {
						objectCount: r2ObjectCount,
						totalSize: totalR2Size,
						totalSizeFormatted: formatBytes(totalR2Size),
						hasMoreObjects: hasMore,
						bucketName: platform.env.R2_BUCKET_NAME || 'z-interact-images',
						publicUrl: platform.env.R2_PUBLIC_URL
					};
				} catch (error) {
					r2Error = error instanceof Error ? error.message : 'Unknown R2 error';
					console.error('❌ Failed to get R2 statistics:', error);
				}
			}

			// Storage health analysis
			const healthStatus = analyzeStorageHealth({
				totalImages,
				r2Images,
				base64Images,
				mixedImages,
				r2Configured,
				r2Error
			});

			return {
				database: {
					totalImages,
					r2Images,
					base64Images,
					mixedImages,
					// Percentage breakdown
					r2Percentage: totalImages > 0 ? Math.round((r2Images / totalImages) * 100) : 0,
					base64Percentage: totalImages > 0 ? Math.round((base64Images / totalImages) * 100) : 0
				},
				r2: {
					enabled: enableR2,
					configured: r2Configured,
					stats: r2Stats,
					error: r2Error
				},
				health: healthStatus,
				recommendations: getStorageRecommendations({
					totalImages,
					r2Images,
					base64Images,
					r2Configured,
					r2Error
				})
			};
		},
		'get-storage-stats'
	);
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeStorageHealth({
	totalImages,
	r2Images,
	base64Images,
	mixedImages,
	r2Configured,
	r2Error
}: {
	totalImages: number;
	r2Images: number;
	base64Images: number;
	mixedImages: number;
	r2Configured: boolean;
	r2Error: string | null;
}): {
	status: 'excellent' | 'good' | 'warning' | 'critical';
	score: number;
	issues: string[];
	summary: string;
} {
	const issues: string[] = [];
	let score = 100;

	// Check for R2 configuration issues
	if (!r2Configured) {
		issues.push('R2 storage not configured');
		score -= 20;
	}

	if (r2Error) {
		issues.push(`R2 connection error: ${r2Error}`);
		score -= 30;
	}

	// Check for base64 images (should be minimized)
	if (base64Images > 0) {
		const base64Percentage = (base64Images / totalImages) * 100;
		if (base64Percentage > 50) {
			issues.push(`High base64 usage: ${base64Percentage.toFixed(1)}% of images`);
			score -= 25;
		} else if (base64Percentage > 20) {
			issues.push(`Moderate base64 usage: ${base64Percentage.toFixed(1)}% of images`);
			score -= 15;
		}
	}

	// Check for mixed storage (should be minimal)
	if (mixedImages > 0) {
		issues.push(`${mixedImages} images have inconsistent storage state`);
		score -= 10;
	}

	// Check if we have images at all
	if (totalImages === 0) {
		issues.push('No images in database');
		score = 50;
	}

	// Determine status
	let status: 'excellent' | 'good' | 'warning' | 'critical';
	if (score >= 90) status = 'excellent';
	else if (score >= 75) status = 'good';
	else if (score >= 50) status = 'warning';
	else status = 'critical';

	// Generate summary
	let summary = '';
	if (totalImages === 0) {
		summary = 'No images found in database';
	} else if (issues.length === 0) {
		summary = `All ${totalImages} images are properly stored in R2`;
	} else {
		summary = `${totalImages} total images with ${issues.length} storage issue${issues.length === 1 ? '' : 's'}`;
	}

	return {
		status,
		score: Math.max(0, score),
		issues,
		summary
	};
}

function getStorageRecommendations({
	totalImages,
	r2Images,
	base64Images,
	r2Configured,
	r2Error
}: {
	totalImages: number;
	r2Images: number;
	base64Images: number;
	r2Configured: boolean;
	r2Error: string | null;
}): string[] {
	const recommendations: string[] = [];

	if (!r2Configured) {
		recommendations.push(
			'Configure R2 storage by setting ENABLE_R2_STORAGE=true and adding R2_IMAGES binding'
		);
	}

	if (r2Error) {
		recommendations.push(
			'Fix R2 connection issues by checking bucket permissions and configuration'
		);
	}

	if (base64Images > 0) {
		recommendations.push(
			`Migrate ${base64Images} base64 images to R2 using POST /api/migrate-images`
		);
	}

	if (totalImages > 0 && r2Images === 0 && r2Configured && !r2Error) {
		recommendations.push(
			'Start migrating images to R2 storage to improve performance and reduce database size'
		);
	}

	if (recommendations.length === 0 && totalImages > 0) {
		recommendations.push('Storage configuration is optimal - consider regular backups');
	}

	return recommendations;
}
