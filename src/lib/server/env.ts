// Unified Environment Management for SvelteKit
// Provides type-safe, platform-compatible access to all environment variables

import { env as svelteEnv } from '$env/dynamic/private';

// Environment interface for type safety
export interface EnvConfig {
	// Core application variables
	DATABASE_URL: string;
	FAL_API_KEY?: string;
	SESSION_SECRET?: string;

	// Cloudflare-specific variables
	CLOUDFLARE_API_TOKEN?: string;
	CLOUDFLARE_ACCOUNT_ID?: string;

	// Migration and development variables
	MIGRATION_API_URL?: string;
	NODE_ENV?: string;

	// Optional variables for enhanced functionality
	SENTRY_DSN?: string;
	LOG_LEVEL?: string;
}

// Platform detection
function isCloudflareWorkers(): boolean {
	return (
		typeof globalThis !== 'undefined' &&
		typeof globalThis.process === 'undefined' &&
		typeof globalThis.navigator !== 'undefined'
	);
}

// Unified environment accessor with platform compatibility
function getEnvValue(key: string, platform?: any): string | undefined {
	// Cloudflare Workers environment
	if (platform?.env?.[key]) {
		return platform.env[key];
	}

	// Node.js/process.env (for scripts and config files)
	if (typeof process !== 'undefined' && process.env?.[key]) {
		return process.env[key];
	}

	// SvelteKit environment (development)
	if (svelteEnv[key]) {
		return svelteEnv[key];
	}

	return undefined;
}

// Main environment configuration class
export class Environment {
	private platform?: any;

	constructor(platform?: any) {
		this.platform = platform;
	}

	// Core application variables
	get DATABASE_URL(): string {
		return getEnvValue('DATABASE_URL', this.platform) || 'file:./local.db';
	}

	get FAL_API_KEY(): string | undefined {
		return getEnvValue('FAL_API_KEY', this.platform);
	}

	get SESSION_SECRET(): string {
		const secret = getEnvValue('SESSION_SECRET', this.platform);
		if (!secret) {
			// Generate a fallback secret for development/build purposes
			return 'fallback-session-secret-' + Date.now().toString(36);
		}
		return secret;
	}

	// Cloudflare-specific variables
	get CLOUDFLARE_API_TOKEN(): string | undefined {
		return getEnvValue('CLOUDFLARE_API_TOKEN', this.platform);
	}

	get CLOUDFLARE_ACCOUNT_ID(): string | undefined {
		return getEnvValue('CLOUDFLARE_ACCOUNT_ID', this.platform);
	}

	// Migration and development variables
	get MIGRATION_API_URL(): string {
		return (
			getEnvValue('MIGRATION_API_URL', this.platform) || 'http://localhost:8788/api/migrate-images'
		);
	}

	get NODE_ENV(): string {
		return getEnvValue('NODE_ENV', this.platform) || 'development';
	}

	// Optional variables
	get SENTRY_DSN(): string | undefined {
		return getEnvValue('SENTRY_DSN', this.platform);
	}

	get LOG_LEVEL(): string {
		return getEnvValue('LOG_LEVEL', this.platform) || 'info';
	}

	// Utility methods
	isProduction(): boolean {
		return this.NODE_ENV === 'production';
	}

	isDevelopment(): boolean {
		return this.NODE_ENV === 'development';
	}

	isCloudflare(): boolean {
		return isCloudflareWorkers();
	}

	// Get all environment variables as a typed object
	toConfig(): EnvConfig {
		return {
			DATABASE_URL: this.DATABASE_URL,
			FAL_API_KEY: this.FAL_API_KEY,
			SESSION_SECRET: this.SESSION_SECRET,
			CLOUDFLARE_API_TOKEN: this.CLOUDFLARE_API_TOKEN,
			CLOUDFLARE_ACCOUNT_ID: this.CLOUDFLARE_ACCOUNT_ID,
			MIGRATION_API_URL: this.MIGRATION_API_URL,
			NODE_ENV: this.NODE_ENV,
			SENTRY_DSN: this.SENTRY_DSN,
			LOG_LEVEL: this.LOG_LEVEL
		};
	}
}

// Default instance for convenience
export const env = new Environment();

// Legacy compatibility exports (will be removed in future versions)
export const FAL_API_KEY = env.FAL_API_KEY;
export const DATABASE_URL = env.DATABASE_URL;
export const SESSION_SECRET = env.SESSION_SECRET;

// Legacy function exports for backwards compatibility
export function getDatabaseUrl(platform?: any): string {
	return new Environment(platform).DATABASE_URL;
}

export function getSessionSecret(platform?: any): string {
	return new Environment(platform).SESSION_SECRET;
}

export function getEnvVar(key: string, platform?: any): string | undefined {
	return getEnvValue(key, platform);
}
