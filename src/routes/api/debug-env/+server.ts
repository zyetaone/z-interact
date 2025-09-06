import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	const { platform } = event;
	
	// Diagnostic information about the environment
	const diagnostics = {
		timestamp: new Date().toISOString(),
		platform: {
			exists: !!platform,
			env: {
				exists: !!platform?.env,
				keys: platform?.env ? Object.keys(platform.env).filter(key => !key.includes('SECRET') && !key.includes('KEY')) : [],
				hasFalKey: !!platform?.env?.FAL_API_KEY,
				falKeyLength: platform?.env?.FAL_API_KEY ? platform.env.FAL_API_KEY.length : 0,
				falKeyPrefix: platform?.env?.FAL_API_KEY ? 'Set (' + platform.env.FAL_API_KEY.substring(0, 8) + '...)' : 'Not set'
			},
			context: {
				hasD1: !!platform?.env?.z_interact_db,
				hasR2: !!platform?.env?.R2_IMAGES
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