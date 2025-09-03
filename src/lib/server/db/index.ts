import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// Use environment variable or fallback to local file
const databaseUrl = env.DATABASE_URL || 'file:./local.db';

const client = createClient({ url: databaseUrl });

export const db = drizzle(client, { schema });

// Cloudflare D1 Database support
export function createDrizzle(platform: any) {
	if (platform?.env?.z_interact_db) {
		// Use Cloudflare D1 database
		return drizzle(platform.env.z_interact_db, { schema });
	}
	// Fallback to default connection
	return db;
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
