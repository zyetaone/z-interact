// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

// D1Database type definition for Cloudflare Workers
interface D1Database {
	prepare(query: string): D1PreparedStatement;
	dump(): Promise<ArrayBuffer>;
	batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Response<T>[]>;
	exec(query: string): Promise<D1Response>;
}

interface D1PreparedStatement {
	bind(...values: any[]): D1PreparedStatement;
	first<T = unknown>(colName?: string): Promise<T>;
	run<T = unknown>(): Promise<D1Response<T>>;
	all<T = unknown>(): Promise<D1Response<T[]>>;
	raw<T = unknown[]>(): Promise<T[]>;
}

interface D1Response<T = unknown> {
	results?: T;
	lastRowId?: number;
	changes?: number;
	duration?: number;
	success: boolean;
}

declare global {
	namespace App {
		interface Locals {
			// No authentication required for this application
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				z_interact_db: D1Database;
				FAL_API_KEY?: string;
				SESSION_SECRET?: string;
				ENABLE_R2_STORAGE?: string;
				R2_IMAGES?: R2Bucket;
				R2_PUBLIC_URL?: string;
			};
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
