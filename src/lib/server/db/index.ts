import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// Create database connection - only for development/local
let localDb: any = null;

function createLocalDb() {
	if (!localDb) {
		const databaseUrl = env.DATABASE_URL || 'file:./local.db';
		const client = createClient({ url: databaseUrl });
		localDb = drizzle(client, { schema });
	}
	return localDb;
}

// Main database function - always use this
export function getDb(platform?: any) {
	// In Cloudflare Workers, use D1 binding
	if (platform?.env?.z_interact_db) {
		return drizzle(platform.env.z_interact_db, { schema });
	}
	
	// For development/local, use libsql client
	return createLocalDb();
}

// Legacy export for backwards compatibility (development only)
export const db = createLocalDb();

// Cloudflare D1 Database support (legacy function name)
export function createDrizzle(platform: any) {
	return getDb(platform);
}

// Helper function to initialize database
export async function initDatabase() {
	try {
		// Test connection by running a simple query
		await db.select().from(schema.users).limit(1);
		console.log('✅ Database connection established');
	} catch (error) {
		console.error('❌ Database connection failed:', error);
		throw error;
	}
}

// Export schema for convenience
export { schema };
