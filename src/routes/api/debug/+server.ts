import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getCorsHeaders } from '$lib/server/cors';

export async function GET(event: RequestEvent) {
	const corsHeaders = getCorsHeaders(event.request.headers.get('origin'));
	
	try {
		const debugInfo = {
			timestamp: new Date().toISOString(),
			platform: {
				exists: !!event.platform,
				env: {
					exists: !!event.platform?.env,
					z_interact_db: !!event.platform?.env?.z_interact_db,
					OPENAI_API_KEY: !!event.platform?.env?.OPENAI_API_KEY,
					SESSION_SECRET: !!event.platform?.env?.SESSION_SECRET,
					R2_IMAGES: !!event.platform?.env?.R2_IMAGES,
					R2_PUBLIC_URL: !!event.platform?.env?.R2_PUBLIC_URL,
					ENABLE_R2_STORAGE: !!event.platform?.env?.ENABLE_R2_STORAGE
				},
				context: !!event.platform?.context,
				caches: !!event.platform?.caches
			},
			runtime: {
				process: typeof process !== 'undefined',
				nodeEnv: typeof process !== 'undefined' ? process.env?.NODE_ENV : 'undefined',
				userAgent: event.request.headers.get('user-agent'),
				cfRay: event.request.headers.get('cf-ray'),
				cfCountry: event.request.headers.get('cf-ipcountry')
			}
		};

		return json(debugInfo, { headers: corsHeaders });
	} catch (error) {
		console.error('Debug endpoint error:', error);
		return json({
			error: 'Debug endpoint failed',
			debug: error instanceof Error ? error.message : String(error)
		}, { status: 500, headers: corsHeaders });
	}
}

export async function OPTIONS(event: RequestEvent) {
	return new Response(null, {
		status: 200,
		headers: getCorsHeaders(event.request.headers.get('origin'))
	});
}