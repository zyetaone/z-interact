// CORS utility for consistent cross-origin handling
export const allowedOrigins = [
	'https://z-interact.pages.dev',
	'https://workspace2030.zyeta.com',
	'http://localhost:5173',
	'http://localhost:4173'
];

export function getCorsHeaders(origin?: string | null): Record<string, string> {
	// Check if origin is in allowed list, otherwise use wildcard
	const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';

	return {
		'Access-Control-Allow-Origin': corsOrigin,
		'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Allow-Credentials': 'false',
		'Access-Control-Max-Age': '86400' // Cache preflight for 24 hours
	};
}

export function createOptionsResponse(origin?: string | null): Response {
	return new Response(null, {
		headers: getCorsHeaders(origin),
		status: 204
	});
}
