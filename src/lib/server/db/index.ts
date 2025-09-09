import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzleLibSQL } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '../env';
import { logger } from '$lib/utils/logger';
import type { Platform } from '$lib/types';

// Database connection types
type DatabaseConnection = ReturnType<typeof drizzleD1 | typeof drizzleLibSQL>;

/**
 * Creates a database connection based on the environment
 * - Production: Uses Cloudflare D1 binding
 * - Development: Uses local SQLite file via libSQL
 */
export function getDb(platform?: Platform): DatabaseConnection {
	const isCloudflare = typeof process === 'undefined';
	const isDevelopment = !isCloudflare && (env.NODE_ENV === 'development' || !env.NODE_ENV);

	logger.info('Database connection attempt', {
		component: 'Database',
		operation: 'connection_init',
		isCloudflare,
		isDevelopment,
		hasPlatform: !!platform,
		hasD1Binding: !!platform?.env?.z_interact_db
	});

	// Cloudflare Pages/Workers - MUST use D1 binding
	if (isCloudflare) {
		if (!platform?.env?.z_interact_db) {
			throw new Error('D1 database binding "z_interact_db" not found in Cloudflare environment');
		}
		logger.info('Using D1 database connection', {
			component: 'Database',
			operation: 'connection_init'
		});
		return drizzleD1(platform.env.z_interact_db, { schema });
	}

	// Local development - use libSQL
	if (isDevelopment) {
		try {
			const client = createClient({ url: env.DATABASE_URL });
			logger.info('Using libSQL database connection', {
				component: 'Database',
				operation: 'connection_init',
				databaseUrl: env.DATABASE_URL?.substring(0, 30) + '...'
			});
			return drizzleLibSQL(client, { schema });
		} catch (error) {
			throw new Error(
				`Local database connection failed. Ensure DATABASE_URL is set correctly. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	// Production Node.js - prefer D1 if available, fallback to libSQL
	if (platform?.env?.z_interact_db) {
		logger.info('Using D1 database connection in production', {
			component: 'Database',
			operation: 'connection_init'
		});
		return drizzleD1(platform.env.z_interact_db, { schema });
	}

	// Final fallback for production without platform binding
	try {
		const client = createClient({ url: env.DATABASE_URL });
		logger.info('Using libSQL fallback in production', {
			component: 'Database',
			operation: 'connection_init',
			databaseUrl: env.DATABASE_URL?.substring(0, 30) + '...'
		});
		return drizzleLibSQL(client, { schema });
	} catch (error) {
		throw new Error(
			`Production database connection failed. No D1 binding found and libSQL fallback failed. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

// Export schema for convenience
export { schema };

// Export types for use in other modules
export type { DatabaseConnection, Platform };
