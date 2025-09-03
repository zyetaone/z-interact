import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzleLibSQL } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// Create database connection - only for development/local
let localDb: any = null;

function createLocalDb() {
	if (!localDb) {
		const databaseUrl = env.DATABASE_URL || 'file:./local.db';
		const client = createClient({ url: databaseUrl });
		localDb = drizzleLibSQL(client, { schema });
	}
	return localDb;
}

// Main database function - always use this
export function getDb(platform?: any) {
	// Debug logging for production issues
	console.log('🔍 getDb called with platform:', {
		hasPlatform: !!platform,
		hasEnv: !!platform?.env,
		hasD1Binding: !!platform?.env?.z_interact_db,
		envKeys: platform?.env ? Object.keys(platform.env).filter(k => k !== 'z_interact_db') : [],
		d1BindingType: typeof platform?.env?.z_interact_db
	});

	// In Cloudflare Workers, use D1 binding with correct adapter
	if (platform?.env?.z_interact_db) {
		console.log('✅ Using D1 database connection with binding');
		try {
			const db = drizzleD1(platform.env.z_interact_db, { schema });
			console.log('✅ D1 Drizzle instance created successfully');
			return db;
		} catch (error) {
			console.error('❌ Failed to create D1 Drizzle instance:', error);
			throw error;
		}
	}
	
	console.log('⚠️  Using local database connection (fallback)');
	console.log('⚠️  This will likely fail in production environment');
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
