import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzleLibSQL } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '../env';

// Database connection types
type DatabaseConnection = ReturnType<typeof drizzleD1 | typeof drizzleLibSQL>;
type Platform = { env?: Record<string, any> } | undefined;

// Singleton database instance
let dbInstance: DatabaseConnection | null = null;

/**
 * Creates a database connection based on the environment
 * - Production: Uses Cloudflare D1 binding
 * - Development: Uses local SQLite file via libSQL
 */
function createDatabaseConnection(platform?: Platform): DatabaseConnection {
	// Check for Cloudflare D1 binding (production)
	if (platform?.env?.z_interact_db) {
		console.log('🔗 Using Cloudflare D1 database connection');
		return drizzleD1(platform.env.z_interact_db, { schema });
	}

	// Development fallback using libSQL
	try {
		console.log('🔗 Using local SQLite database connection');
		const client = createClient({ url: env.DATABASE_URL });
		return drizzleLibSQL(client, { schema });
	} catch (error) {
		console.error('❌ Failed to create database connection:', error);
		throw new Error(
			`Database connection failed. Ensure DATABASE_URL is set correctly. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Gets the database connection instance
 * Creates the connection on first call and reuses it for subsequent calls
 */
export function getDb(platform?: Platform): DatabaseConnection {
	if (!dbInstance) {
		try {
			dbInstance = createDatabaseConnection(platform);
			console.log('✅ Database connection established successfully');
		} catch (error) {
			console.error('❌ Database connection failed:', error);
			throw error;
		}
	}
	return dbInstance;
}

// Export schema for convenience
export { schema };

// Export types for use in other modules
export type { DatabaseConnection, Platform };
