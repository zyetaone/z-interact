#!/usr/bin/env node

/**
 * Enhanced Image Migration Script
 * Comprehensive migration utility for moving images from base64 database storage to R2
 *
 * Usage:
 *   node scripts/migrate-images.js [command] [options]
 *
 * Commands:
 *   migrate    - Migrate all images to R2
 *   validate   - Validate migration integrity
 *   rollback   - Rollback migration (move images back to database)
 *   stats      - Show migration statistics
 *   backup     - Create migration backup
 *   status     - Show current migration status
 *
 * Options:
 *   --dry-run          - Preview changes without making them
 *   --batch-size <n>   - Process images in batches of n (default: 10)
 *   --concurrency <n>  - Number of concurrent operations (default: 3)
 *   --sample-size <n>  - For validation, check only n images
 *   --check-integrity  - Perform integrity checks during validation
 *   --image-ids <ids>  - Comma-separated list of image IDs for partial operations
 *   --no-delete-r2     - Don't delete R2 objects during rollback
 */

const https = require('https');
const http = require('http');

// Simple environment accessor for Node.js scripts
const getEnv = (key, defaultValue) => {
	return process.env[key] || defaultValue;
};

const API_BASE = getEnv('MIGRATION_API_URL', 'http://localhost:8788/api/migrate-images');

// Parse command line arguments
function parseArgs() {
	const args = process.argv.slice(2);
	const command = args[0];
	const options = {};

	for (let i = 1; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith('--')) {
			const key = arg.slice(2);
			const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
			options[key] = value;
		}
	}

	return { command, options };
}

// Make HTTP request to migration API
function makeRequest(action, options = {}) {
	return new Promise((resolve, reject) => {
		const postData = JSON.stringify({
			action,
			...options
		});

		const url = new URL(API_BASE);
		const reqOptions = {
			hostname: url.hostname,
			port: url.port,
			path: url.pathname,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(postData)
			}
		};

		const req = http.request(reqOptions, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				try {
					const response = JSON.parse(data);
					if (response.success) {
						resolve(response);
					} else {
						reject(new Error(response.error || 'Request failed'));
					}
				} catch (error) {
					reject(new Error(`Failed to parse response: ${error.message}`));
				}
			});
		});

		req.on('error', (error) => {
			reject(new Error(`Request failed: ${error.message}`));
		});

		req.write(postData);
		req.end();
	});
}

// Get migration status
async function getStatus() {
	return new Promise((resolve, reject) => {
		const url = new URL(API_BASE);
		const reqOptions = {
			hostname: url.hostname,
			port: url.port,
			path: url.pathname,
			method: 'GET'
		};

		const req = http.request(reqOptions, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				try {
					const response = JSON.parse(data);
					resolve(response);
				} catch (error) {
					reject(new Error(`Failed to parse response: ${error.message}`));
				}
			});
		});

		req.on('error', (error) => {
			reject(new Error(`Request failed: ${error.message}`));
		});

		req.end();
	});
}

// Format duration
function formatDuration(ms) {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
	} else if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	} else {
		return `${seconds}s`;
	}
}

// Progress tracking for long-running operations
function trackProgress(operation, interval = 5000) {
	const progressInterval = setInterval(async () => {
		try {
			const status = await getStatus();
			if (status.migrationStats) {
				const stats = status.migrationStats;
				const progress = Math.round(stats.migrationProgress * 100) / 100;
				console.log(
					`📊 Progress: ${stats.migratedImages}/${stats.totalImages} migrated (${progress}%)`
				);
			}
		} catch (error) {
			// Silently ignore progress check errors
		}
	}, interval);

	return progressInterval;
}

// Main execution
async function main() {
	const { command, options } = parseArgs();

	if (!command) {
		console.log('❌ No command specified');
		console.log('Available commands: migrate, validate, rollback, stats, backup, status');
		process.exit(1);
	}

	try {
		// Check API status first
		console.log('🔍 Checking migration API status...');
		const status = await getStatus();

		if (!status.migrationReady) {
			console.log('❌ Migration API not ready:', status.message || 'Unknown error');
			process.exit(1);
		}

		console.log('✅ Migration API ready');
		console.log(
			`📊 Current stats: ${status.migrationStats?.migratedImages || 0}/${status.migrationStats?.totalImages || 0} migrated`
		);

		let result;

		switch (command) {
			case 'migrate':
				console.log('🚀 Starting image migration...');
				if (options.dryRun) {
					console.log('🔍 DRY RUN MODE - No changes will be made');
				}

				const progressTracker = trackProgress('migration');

				result = await makeRequest('migrate', {
					batchSize: parseInt(options.batchSize) || 10,
					dryRun: options.dryRun === true,
					concurrency: parseInt(options.concurrency) || 3
				});

				clearInterval(progressTracker);

				if (result.result.success) {
					console.log(`✅ Migration completed successfully!`);
					console.log(`📊 Results: ${result.result.migrated}/${result.result.total} migrated`);
					if (result.result.failed > 0) {
						console.log(`❌ ${result.result.failed} images failed to migrate`);
					}
					console.log(`⏱️ Duration: ${formatDuration(result.result.duration)}`);
				} else {
					console.log('❌ Migration failed');
					process.exit(1);
				}
				break;

			case 'validate':
				console.log('🔍 Starting migration validation...');

				result = await makeRequest('validate', {
					checkIntegrity: options.checkIntegrity === true,
					sampleSize: options.sampleSize ? parseInt(options.sampleSize) : undefined
				});

				if (result.result.isValid) {
					console.log('✅ Migration validation passed!');
					console.log(`📊 ${result.result.valid}/${result.result.totalChecked} images valid`);
				} else {
					console.log('❌ Migration validation failed');
					console.log(
						`📊 ${result.result.valid}/${result.result.totalChecked} images valid, ${result.result.invalid} invalid`
					);
					if (result.result.missing.length > 0) {
						console.log(`❌ Missing images: ${result.result.missing.length}`);
					}
					if (result.result.corrupted.length > 0) {
						console.log(`🔧 Corrupted images: ${result.result.corrupted.length}`);
					}
					process.exit(1);
				}
				break;

			case 'rollback':
				console.log('🔄 Starting migration rollback...');
				if (options.dryRun) {
					console.log('🔍 DRY RUN MODE - No changes will be made');
				}

				const rollbackOptions = {
					batchSize: parseInt(options.batchSize) || 10,
					dryRun: options.dryRun === true,
					deleteFromR2: options['no-delete-r2'] !== true
				};

				if (options.imageIds) {
					rollbackOptions.imageIds = options.imageIds.split(',');
					console.log(`🎯 Partial rollback for ${rollbackOptions.imageIds.length} specific images`);
				}

				result = await makeRequest('rollback', rollbackOptions);

				if (result.result.success) {
					console.log('✅ Rollback completed successfully!');
					console.log(`📊 ${result.result.rolledBack}/${result.result.total} images rolled back`);
				} else {
					console.log('❌ Rollback failed');
					process.exit(1);
				}
				break;

			case 'stats':
				console.log('📊 Getting migration statistics...');
				result = await makeRequest('stats');

				const stats = result.result;
				console.log('📈 Migration Statistics:');
				console.log(`   Total Images: ${stats.totalImages}`);
				console.log(`   Migrated to R2: ${stats.migratedImages}`);
				console.log(`   Still in Database: ${stats.base64Images}`);
				console.log(`   Partially Migrated: ${stats.partiallyMigratedImages}`);
				console.log(`   Migration Progress: ${Math.round(stats.migrationProgress * 100) / 100}%`);
				console.log(`   Estimated Space Saved: ${stats.estimatedSpaceSaved}`);
				break;

			case 'backup':
				console.log('💾 Creating migration backup...');
				result = await makeRequest('backup');

				if (result.result.success) {
					console.log('✅ Backup created successfully!');
					console.log(`📊 ${result.result.recordCount} records backed up`);
				} else {
					console.log('❌ Backup failed:', result.result.error);
					process.exit(1);
				}
				break;

			case 'status':
				console.log('📊 Migration Status:');
				console.log(`   R2 Configured: ${status.r2Configured ? '✅' : '❌'}`);
				console.log(`   R2 Status: ${status.r2Status}`);
				console.log(`   R2 Objects: ${status.r2ObjectsCount}`);
				console.log(`   Migration Ready: ${status.migrationReady ? '✅' : '❌'}`);
				console.log(`   Batch Size: ${status.batchSize}`);
				console.log(`   API Version: ${status.apiVersion}`);

				if (status.migrationStats) {
					const stats = status.migrationStats;
					console.log('');
					console.log('📈 Current Statistics:');
					console.log(`   Total Images: ${stats.totalImages}`);
					console.log(`   Migrated: ${stats.migratedImages}`);
					console.log(`   Progress: ${Math.round(stats.migrationProgress * 100) / 100}%`);
				}
				break;

			default:
				console.log(`❌ Unknown command: ${command}`);
				console.log('Available commands: migrate, validate, rollback, stats, backup, status');
				process.exit(1);
		}
	} catch (error) {
		console.error('❌ Error:', error.message);
		process.exit(1);
	}
}

// Run the script
if (require.main === module) {
	main().catch((error) => {
		console.error('❌ Script failed:', error);
		process.exit(1);
	});
}

module.exports = { makeRequest, getStatus };
