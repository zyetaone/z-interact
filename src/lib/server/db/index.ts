import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzleLibSQL } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// Create database connection - only for development/local
let localDb: any = null;

function createLocalDb() {
	if (!localDb) {
		// In Cloudflare Workers environment (wrangler dev), use a libsql://localhost URL
		// This is a workaround since libSQL client doesn't support "file:" URLs in Workers
		const databaseUrl = env.DATABASE_URL || 'libsql://localhost:8080';
		
		try {
			const client = createClient({ url: databaseUrl });
			localDb = drizzleLibSQL(client, { schema });
		} catch (error) {
			console.error('❌ Failed to create libSQL client with URL:', databaseUrl, error);
			// If libSQL connection fails, this means we're in an unsupported environment
			// Return null to indicate no database is available
			return null;
		}
	}
	return localDb;
}

// Main database function - always use this
export function getDb(platform?: any) {
	// Debug logging for production issues
	console.log('🔍 getDb called with platform:', {
		hasPlatform: !!platform,
		platformType: typeof platform,
		platformKeys: platform ? Object.keys(platform) : [],
		hasEnv: !!platform?.env,
		envType: typeof platform?.env,
		envKeys: platform?.env ? Object.keys(platform.env) : [],
		hasD1Binding: !!platform?.env?.z_interact_db,
		d1BindingType: typeof platform?.env?.z_interact_db,
		globalKeys: typeof globalThis !== 'undefined' ? Object.keys(globalThis).filter(k => k.includes('env') || k.includes('d1') || k.includes('DB')) : [],
		processEnvHasDBURL: typeof process !== 'undefined' && !!process?.env?.DATABASE_URL
	});

	// In Cloudflare Workers/Pages, use D1 binding with correct adapter
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
	
	// Check if we're in a Cloudflare environment but binding failed
	// This handles both production and wrangler dev environments
	if (typeof globalThis?.process === 'undefined' && typeof globalThis?.navigator !== 'undefined') {
		console.error('❌ Running in Cloudflare environment but D1 binding not found');
		console.error('❌ Platform object structure:', {
			platform: !!platform,
			env: !!platform?.env,
			envKeys: platform?.env ? Object.keys(platform.env) : 'no env',
			d1Binding: !!platform?.env?.z_interact_db
		});
		throw new Error('D1 database binding not available. Please check your wrangler.toml configuration.');
	}
	
	console.log('⚠️  Using local database connection (fallback)');
	console.log('⚠️  This will likely fail in production environment');
	// For development/local, use libsql client
	return createLocalDb();
}

// Legacy export for backwards compatibility (development only)
// NOTE: This should not be used in production - use getDb(platform) instead
// Lazily create the connection only when accessed to avoid issues in Cloudflare Workers
let _legacyDb: any = null;
export const db = new Proxy({} as any, {
	get(target, prop) {
		if (!_legacyDb) {
			console.log('⚠️  Legacy db export being accessed - this may cause issues in Cloudflare environment');
			try {
				_legacyDb = createLocalDb();
			} catch (error) {
				console.error('❌ Failed to create legacy db connection:', error);
				_legacyDb = null;
			}
		}
		return _legacyDb?.[prop];
	}
});

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
