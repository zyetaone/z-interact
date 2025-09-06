import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	const { platform } = event;
	
	// Try to access FAL_API_KEY in different ways
	let falKeyStatus = 'Not found';
	let falKeyLength = 0;
	
	// Method 1: Direct access
	if (platform?.env?.FAL_API_KEY) {
		falKeyStatus = 'Found via platform.env.FAL_API_KEY';
		falKeyLength = platform.env.FAL_API_KEY.length;
	}
	// Method 2: With trailing space (Cloudflare bug)
	else if (platform?.env?.['FAL_API_KEY ']) {
		falKeyStatus = 'Found via platform.env["FAL_API_KEY "] (with trailing space)';
		falKeyLength = platform.env['FAL_API_KEY '].length;
	}
	// Method 3: Check if it's in the context
	else if (platform?.context?.FAL_API_KEY) {
		falKeyStatus = 'Found via platform.context';
		falKeyLength = platform.context.FAL_API_KEY.length;
	}
	// Method 4: Check process env (shouldn't work in Cloudflare)
	else if (typeof process !== 'undefined' && process.env?.FAL_API_KEY) {
		falKeyStatus = 'Found via process.env';
		falKeyLength = process.env.FAL_API_KEY.length;
	}
	
	// Diagnostic information about the environment
	const diagnostics = {
		timestamp: new Date().toISOString(),
		platform: {
			exists: !!platform,
			env: {
				exists: !!platform?.env,
				keys: platform?.env ? Object.keys(platform.env).filter(key => !key.includes('SECRET') && !key.includes('KEY')) : [],
				allKeys: platform?.env ? Object.keys(platform.env) : [],
				hasFalKey: !!platform?.env?.FAL_API_KEY,
				falKeyStatus,
				falKeyLength,
				falKeyPrefix: platform?.env?.FAL_API_KEY ? 'Set (' + platform.env.FAL_API_KEY.substring(0, 8) + '...)' : 'Not set'
			},
			context: {
				hasD1: !!platform?.env?.z_interact_db,
				hasR2: !!platform?.env?.R2_IMAGES,
				contextKeys: platform?.context ? Object.keys(platform.context) : []
			}
		},
		process: {
			exists: typeof process !== 'undefined',
			env: {
				nodeEnv: typeof process !== 'undefined' ? process.env.NODE_ENV : 'N/A'
			}
		}
	};
	
	return json(diagnostics);
}