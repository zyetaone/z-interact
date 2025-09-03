// Environment variables for SvelteKit with Cloudflare Workers compatibility
import { env } from '$env/dynamic/private';

// Server-side environment variable access - works with both Node.js and Cloudflare Workers
export function getEnvVar(key: string, platform?: any): string | undefined {
	// For Cloudflare Workers, use platform.env
	if (platform?.env?.[key]) {
		return platform.env[key];
	}
	
	// For development/Node.js, use SvelteKit's env
	if (env[key]) {
		return env[key];
	}

	return undefined;
}

// Specific getters for commonly used variables
export function getOpenAIKey(platform?: any): string | undefined {
	return getEnvVar('OPENAI_API_KEY', platform);
}

export function getDatabaseUrl(platform?: any): string {
	return getEnvVar('DATABASE_URL', platform) || 'file:./local.db';
}

export function getSessionSecret(platform?: any): string {
	return getEnvVar('SESSION_SECRET', platform) || 'default-secret-change-in-production';
}

// Legacy exports for backwards compatibility (development only)
export const OPENAI_API_KEY = env.OPENAI_API_KEY;
export const DATABASE_URL = env.DATABASE_URL || 'file:./local.db';
export const SESSION_SECRET = env.SESSION_SECRET || 'default-secret-change-in-production';