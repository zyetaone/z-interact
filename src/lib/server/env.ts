// Cloudflare Workers-compatible environment management for SvelteKit
import { env as svelteEnv } from '$env/dynamic/private';

// Safe process.env access that works in both Node.js and Cloudflare Workers
const getProcessEnv = (key: string): string | undefined => {
	if (typeof process !== 'undefined' && process.env) {
		return process.env[key];
	}
	return undefined;
};

// Pre-resolve all environment variables to avoid process.env in bundled output
const DATABASE_URL_VALUE =
	getProcessEnv('DATABASE_URL') || svelteEnv.DATABASE_URL || 'file:./local.db';
const FAL_API_KEY_VALUE =
	getProcessEnv('FAL_API_KEY ') || getProcessEnv('FAL_API_KEY') || svelteEnv.FAL_API_KEY;
const SESSION_SECRET_VALUE =
	getProcessEnv('SESSION_SECRET') || svelteEnv.SESSION_SECRET || 'dev-secret';
const CLOUDFLARE_API_TOKEN_VALUE =
	getProcessEnv('CLOUDFLARE_API_TOKEN') || svelteEnv.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID_VALUE =
	getProcessEnv('CLOUDFLARE_ACCOUNT_ID') || svelteEnv.CLOUDFLARE_ACCOUNT_ID;
const NODE_ENV_VALUE = getProcessEnv('NODE_ENV') || 'development';

// Environment access with Cloudflare Workers compatibility
// Values are pre-resolved to avoid bundling process.env references
export const env = {
	DATABASE_URL: DATABASE_URL_VALUE,
	FAL_API_KEY: FAL_API_KEY_VALUE,
	SESSION_SECRET: SESSION_SECRET_VALUE,
	CLOUDFLARE_API_TOKEN: CLOUDFLARE_API_TOKEN_VALUE,
	CLOUDFLARE_ACCOUNT_ID: CLOUDFLARE_ACCOUNT_ID_VALUE,
	NODE_ENV: NODE_ENV_VALUE
};
