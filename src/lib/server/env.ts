// Environment loader for SvelteKit server-side code
import fs from 'fs';
import path from 'path';

let envCache: Record<string, string> | null = null;

function loadEnvFile() {
	if (envCache) return envCache;

	try {
		const envPath = path.join(process.cwd(), '.env');
		if (fs.existsSync(envPath)) {
			const envContent = fs.readFileSync(envPath, 'utf-8');
			envCache = envContent.split('\n').reduce((acc, line) => {
				const [key, ...valueParts] = line.split('=');
				if (key && valueParts.length > 0) {
					acc[key.trim()] = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
				}
				return acc;
			}, {});
		} else {
			envCache = {};
		}
	} catch (error) {
		console.error('Error loading .env file:', error);
		envCache = {};
	}

	return envCache;
}

// Server-side environment variable access
export function getEnvVar(key: string): string | undefined {
	// First try process.env (for production)
	if (process.env[key]) {
		return process.env[key];
	}

	// Then try loading from .env file (for development)
	const envVars = loadEnvFile();
	return envVars[key];
}

// Specific getters for commonly used variables
export const OPENAI_API_KEY = getEnvVar('OPENAI_API_KEY');
export const DATABASE_URL = getEnvVar('DATABASE_URL') || 'file:./local.db';
export const SESSION_SECRET = getEnvVar('SESSION_SECRET') || 'default-secret-change-in-production';