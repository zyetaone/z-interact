import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzleLibSQL } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '../env';

// Database connection types
type DatabaseConnection = ReturnType<typeof drizzleD1 | typeof drizzleLibSQL>;
type Platform = { env?: Record<string, any> } | undefined;

/**
 * Creates a database connection based on the environment
 * - Production: Uses Cloudflare D1 binding
 * - Development: Uses local SQLite file via libSQL
 */
export function getDb(platform?: Platform): DatabaseConnection {
	const isCloudflare = typeof process === 'undefined';
	const isDevelopment = typeof process !== 'undefined' && (process.env?.NODE_ENV === 'development' || !process.env?.NODE_ENV);

	console.log('Database connection attempt:', { isCloudflare, isDevelopment, hasPlatform: !!platform, hasD1Binding: !!platform?.env?.z_interact_db });

	// Cloudflare Pages/Workers - MUST use D1 binding
	if (isCloudflare) {
		if (!platform?.env?.z_interact_db) {
			throw new Error('D1 database binding "z_interact_db" not found in Cloudflare environment');
		}
		console.log('Using D1 database connection');
		return drizzleD1(platform.env.z_interact_db, { schema });
	}

	// Local development - use libSQL
	if (isDevelopment) {
		try {
			const client = createClient({ url: env.DATABASE_URL });
			console.log('Using libSQL database connection:', env.DATABASE_URL);
			return drizzleLibSQL(client, { schema });
		} catch (error) {
			throw new Error(
				`Local database connection failed. Ensure DATABASE_URL is set correctly. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	// Production Node.js - prefer D1 if available, fallback to libSQL
	if (platform?.env?.z_interact_db) {
		console.log('Using D1 database connection in production');
		return drizzleD1(platform.env.z_interact_db, { schema });
	}

	// Final fallback for production without platform binding
	try {
		const client = createClient({ url: env.DATABASE_URL });
		console.log('Using libSQL fallback in production:', env.DATABASE_URL);
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
