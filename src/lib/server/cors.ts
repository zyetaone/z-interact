/**
 * Comprehensive CORS utilities for secure API handling
 * Provides standardized CORS headers and preflight handling
 */

export interface CorsOptions {
	/** Allowed origins - can be '*' for all or specific domains */
	allowedOrigins?: string | string[];
	/** Allowed HTTP methods */
	allowedMethods?: string[];
	/** Allowed headers */
	allowedHeaders?: string[];
	/** Whether to allow credentials */
	allowCredentials?: boolean;
	/** Max age for preflight cache in seconds */
	maxAge?: number;
	/** Whether to expose additional headers */
	exposeHeaders?: string[];
}

/**
 * Default CORS configuration following security best practices
 */
export const DEFAULT_CORS_OPTIONS: Required<CorsOptions> = {
	allowedOrigins: '*',
	allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
	allowedHeaders: [
		'Content-Type',
		'Authorization',
		'X-Requested-With',
		'Accept',
		'Accept-Encoding',
		'Accept-Language',
		'Cache-Control',
		'Connection',
		'Host',
		'Origin',
		'Referer',
		'User-Agent'
	],
	allowCredentials: false,
	maxAge: 86400, // 24 hours
	exposeHeaders: []
};

/**
 * Get standardized CORS headers for API responses
 * @param origin - The request origin (from request headers)
 * @param options - CORS configuration options
 * @returns Record of CORS headers
 */
export function getCorsHeaders(
	origin?: string | null,
	options: CorsOptions = {}
): Record<string, string> {
	const config = { ...DEFAULT_CORS_OPTIONS, ...options };
	const headers: Record<string, string> = {};

	// Handle Access-Control-Allow-Origin
	if (config.allowedOrigins === '*') {
		headers['Access-Control-Allow-Origin'] = '*';
	} else if (Array.isArray(config.allowedOrigins)) {
		// Check if the request origin is in the allowed list
		if (origin && config.allowedOrigins.includes(origin)) {
			headers['Access-Control-Allow-Origin'] = origin;
		} else if (config.allowedOrigins.length > 0) {
			headers['Access-Control-Allow-Origin'] = config.allowedOrigins[0];
		}
	} else if (typeof config.allowedOrigins === 'string') {
		headers['Access-Control-Allow-Origin'] = config.allowedOrigins;
	}

	// Handle Access-Control-Allow-Methods
	headers['Access-Control-Allow-Methods'] = config.allowedMethods.join(', ');

	// Handle Access-Control-Allow-Headers
	headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');

	// Handle Access-Control-Max-Age
	headers['Access-Control-Max-Age'] = config.maxAge.toString();

	// Handle Access-Control-Allow-Credentials
	if (config.allowCredentials) {
		headers['Access-Control-Allow-Credentials'] = 'true';
	}

	// Handle Access-Control-Expose-Headers
	if (config.exposeHeaders.length > 0) {
		headers['Access-Control-Expose-Headers'] = config.exposeHeaders.join(', ');
	}

	return headers;
}

/**
 * Handle CORS preflight OPTIONS requests
 * @param event - SvelteKit request event
 * @param options - CORS configuration options
 * @returns Response for OPTIONS request
 */
export function handleCorsPreflight(
	event: { request: { headers: { get: (name: string) => string | null } } },
	options: CorsOptions = {}
): Response {
	const origin = event.request.headers.get('origin');
	const headers = getCorsHeaders(origin, options);

	return new Response(null, {
		status: 204,
		headers
	});
}

/**
 * Create a Response with CORS headers
 * @param body - Response body
 * @param init - Response initialization options
 * @param corsOptions - CORS configuration options
 * @returns Response with CORS headers
 */
export function createCorsResponse(
	body: any,
	init: ResponseInit = {},
	corsOptions: CorsOptions = {}
): Response {
	const origin =
		init.headers instanceof Headers
			? init.headers.get('origin')
			: typeof init.headers === 'object'
				? (init.headers as Record<string, string>)['origin']
				: null;

	const corsHeaders = getCorsHeaders(origin, corsOptions);

	const headers = new Headers(init.headers);
	Object.entries(corsHeaders).forEach(([key, value]) => {
		headers.set(key, value);
	});

	return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
		...init,
		headers
	});
}

/**
 * Validate if an origin is allowed
 * @param origin - Origin to validate
 * @param allowedOrigins - List of allowed origins
 * @returns Whether the origin is allowed
 */
export function isOriginAllowed(origin: string | null, allowedOrigins: string | string[]): boolean {
	if (!origin) return false;

	if (allowedOrigins === '*') return true;
	if (Array.isArray(allowedOrigins)) return allowedOrigins.includes(origin);
	if (typeof allowedOrigins === 'string') return allowedOrigins === origin;

	return false;
}

/**
 * Get CORS headers for JSON API responses
 * Convenience function for common API use case
 * @param origin - Request origin
 * @returns CORS headers for JSON API
 */
export function getJsonApiCorsHeaders(origin?: string | null): Record<string, string> {
	return getCorsHeaders(origin, {
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
		exposeHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
	});
}

/**
 * Get CORS headers for file upload endpoints
 * @param origin - Request origin
 * @returns CORS headers for file uploads
 */
export function getUploadCorsHeaders(origin?: string | null): Record<string, string> {
	return getCorsHeaders(origin, {
		allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: [
			'Content-Type',
			'Authorization',
			'Content-Length',
			'X-Requested-With',
			'Accept-Encoding'
		]
	});
}

/**
 * Security-focused CORS configuration for production
 */
export const PRODUCTION_CORS_OPTIONS: CorsOptions = {
	allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
	allowCredentials: true,
	maxAge: 7200, // 2 hours for production
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

/**
 * Development CORS configuration (more permissive)
 */
export const DEVELOPMENT_CORS_OPTIONS: CorsOptions = {
	allowedOrigins: '*',
	allowCredentials: false,
	maxAge: 86400,
	allowedHeaders: [
		'Content-Type',
		'Authorization',
		'X-Requested-With',
		'Accept',
		'Accept-Encoding',
		'Accept-Language'
	]
};
