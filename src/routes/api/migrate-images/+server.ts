import { R2Storage } from '$lib/server/r2-storage';
import { ImageMigrationService } from '$lib/server/migration-utils';
import { withApiHandler, Validation, ApiResponse, HTTP_STATUS } from '$lib/server/api-utils';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	return withApiHandler(
		event,
		async () => {
			const { request, platform } = event;
			const body = await request.json();
			const {
				action,
				batchSize = 10,
				dryRun = false,
				concurrency = 3,
				imageIds,
				checkIntegrity = false,
				sampleSize,
				deleteFromR2 = true
			} = body;

			Validation.required(action, 'action');

			if (!(platform as any)?.env?.R2_IMAGES) {
				throw new Error('R2 bucket not configured');
			}

			const r2Storage = new R2Storage({
				bucket: (platform as any).env.R2_IMAGES,
				publicUrl: (platform as any).env.R2_PUBLIC_URL
			});

			const migrationService = new ImageMigrationService({
				r2Storage,
				batchSize,
				dryRun,
				concurrency,
				progressCallback: (progress) => {
					// In a real implementation, you might want to broadcast progress via SSE
					console.log(
						`📊 Progress: ${progress.processed}/${progress.total} (${Math.round((progress.processed / progress.total) * 100)}%)`
					);
				}
			});

			let result;

			switch (action) {
				case 'migrate':
					console.log('🚀 Starting enhanced image migration...');
					result = await migrationService.migrateAllImages();
					break;

				case 'validate':
					console.log('🔍 Starting enhanced migration validation...');
					result = await migrationService.validateMigration({
						checkIntegrity,
						sampleSize
					});
					break;

				case 'rollback':
					console.log('🔄 Starting enhanced migration rollback...');
					result = await migrationService.rollbackMigration({
						imageIds,
						batchSize,
						dryRun,
						deleteFromR2
					});
					break;

				case 'stats':
					console.log('📊 Getting migration statistics...');
					result = await migrationService.getMigrationStats();
					break;

				case 'backup':
					console.log('💾 Creating migration backup...');
					result = await migrationService.createMigrationBackup();
					break;

				case 'pause':
					console.log('⏸️ Pausing migration...');
					migrationService.pause();
					result = { message: 'Migration paused' };
					break;

				case 'resume':
					console.log('▶️ Resuming migration...');
					migrationService.resume();
					result = { message: 'Migration resumed' };
					break;

				case 'status':
					console.log('📊 Getting migration status...');
					result = {
						isRunning: migrationService.isMigrationRunning(),
						progress: migrationService.getProgress()
					};
					break;

				default:
					throw new Error(
						`Invalid action: ${action}. Use: migrate, validate, rollback, stats, backup, pause, resume, or status`
					);
			}

			return {
				action,
				result,
				dryRun
			};
		},
		'migrate-images'
	);
}

// GET endpoint to check migration status and get comprehensive information
export async function GET(event: RequestEvent) {
	return withApiHandler(
		event,
		async () => {
			const { platform } = event;

			if (!(platform as any)?.env?.R2_IMAGES) {
				return {
					r2Configured: false,
					enableR2Storage: (platform as any)?.env?.ENABLE_R2_STORAGE === 'true',
					migrationReady: false,
					message: 'R2 bucket not configured'
				};
			}

			const r2Storage = new R2Storage({
				bucket: (platform as any).env.R2_IMAGES,
				publicUrl: (platform as any).env.R2_PUBLIC_URL
			});

			// Check R2 connectivity
			let r2Status = 'unknown';
			let r2ObjectsCount = 0;
			try {
				const listResult = await r2Storage.listImages({ limit: 1000 });
				r2Status = 'connected';
				r2ObjectsCount = listResult.objects?.length || 0;
			} catch (error) {
				r2Status = 'error';
			}

			// Get migration service for stats
			const migrationService = new ImageMigrationService({
				r2Storage,
				batchSize: parseInt((platform as any).env.MIGRATION_BATCH_SIZE || '10')
			});

			let migrationStats;
			try {
				migrationStats = await migrationService.getMigrationStats();
			} catch (error) {
				migrationStats = null;
			}

			return {
				r2Configured: true,
				r2Status,
				r2ObjectsCount,
				enableR2Storage: (platform as any).env.ENABLE_R2_STORAGE === 'true',
				publicUrl: (platform as any).env.R2_PUBLIC_URL,
				batchSize: parseInt((platform as any).env.MIGRATION_BATCH_SIZE || '10'),
				concurrency: 3, // Default concurrency
				migrationReady: r2Status === 'connected',
				migrationStats,
				availableActions: [
					'migrate',
					'validate',
					'rollback',
					'stats',
					'backup',
					'pause',
					'resume',
					'status'
				],
				apiVersion: '2.0',
				features: [
					'progress_tracking',
					'concurrency_control',
					'integrity_validation',
					'partial_rollback',
					'dry_run_mode',
					'backup_creation',
					'pause_resume'
				]
			};
		},
		'get-migration-status'
	);
}
