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
	// Force local development to use libSQL (ignore D1 binding in dev mode)
	const isDevelopment = typeof process !== 'undefined' && (process.env?.NODE_ENV === 'development' || !process.env?.NODE_ENV);

	// Only use D1 in production when platform binding exists
	if (!isDevelopment && platform?.env?.z_interact_db) {
		return drizzleD1(platform.env.z_interact_db, { schema });
	}

	// Development or fallback using libSQL
	try {
		const client = createClient({ url: env.DATABASE_URL });
		return drizzleLibSQL(client, { schema });
	} catch (error) {
		throw new Error(
			`Database connection failed. Ensure DATABASE_URL is set correctly. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

// Export schema for convenience
export { schema };

// Export types for use in other modules
export type { DatabaseConnection, Platform };
