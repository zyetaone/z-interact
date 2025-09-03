import { json } from '@sveltejs/kit';
import { R2Storage } from '$lib/server/r2-storage';
import { ImageMigrationService } from '$lib/server/migration-utils';

export async function POST({ request, platform }) {
	try {
		const { action, batchSize = 10, dryRun = false } = await request.json();

		if (!platform?.env?.R2_IMAGES) {
			return json({ error: 'R2 bucket not configured' }, { status: 500 });
		}

		const r2Storage = new R2Storage({
			bucket: platform.env.R2_IMAGES,
			publicUrl: platform.env.R2_PUBLIC_URL
		});

		const migrationService = new ImageMigrationService({
			r2Storage,
			batchSize,
			dryRun
		});

		let result;

		switch (action) {
			case 'migrate':
				console.log('🚀 Starting image migration...');
				result = await migrationService.migrateAllImages();
				break;

			case 'validate':
				console.log('🔍 Validating migration...');
				result = await migrationService.validateMigration();
				break;

			case 'rollback':
				console.log('🔄 Starting migration rollback...');
				result = await migrationService.rollbackMigration();
				break;

			default:
				return json(
					{ error: 'Invalid action. Use: migrate, validate, or rollback' },
					{ status: 400 }
				);
		}

		return json({
			success: true,
			action,
			result,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('❌ Migration API error:', error);
		return json(
			{
				error: 'Migration failed',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

// GET endpoint to check migration status
export async function GET({ platform }) {
	try {
		if (!platform?.env?.R2_IMAGES) {
			return json({
				r2Configured: false,
				enableR2Storage: platform?.env?.ENABLE_R2_STORAGE === 'true'
			});
		}

		const r2Storage = new R2Storage({
			bucket: platform.env.R2_IMAGES,
			publicUrl: platform.env.R2_PUBLIC_URL
		});

		// Quick check of R2 connectivity
		let r2Status = 'unknown';
		try {
			await r2Storage.listImages({ limit: 1 });
			r2Status = 'connected';
		} catch (error) {
			r2Status = 'error';
		}

		return json({
			r2Configured: true,
			r2Status,
			enableR2Storage: platform.env.ENABLE_R2_STORAGE === 'true',
			publicUrl: platform.env.R2_PUBLIC_URL,
			batchSize: parseInt(platform.env.MIGRATION_BATCH_SIZE || '10')
		});
	} catch (error) {
		return json(
			{
				error: 'Status check failed',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
