import { json, type RequestEvent } from '@sveltejs/kit';

// Standardized API Response Types
export interface ApiSuccessResponse<T = any> {
	success: true;
	data: T;
	timestamp: string;
	requestId?: string;
}

export interface ApiErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		details?: any;
	};
	timestamp: string;
	requestId?: string;
}

// HTTP Status Codes
export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	UNPROCESSABLE_ENTITY: 422,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
	SERVICE_UNAVAILABLE: 503
} as const;

// Error Codes
export const ERROR_CODES = {
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
	AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
	NOT_FOUND: 'NOT_FOUND',
	CONFLICT: 'CONFLICT',
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
	DATABASE_ERROR: 'DATABASE_ERROR',
	STORAGE_ERROR: 'STORAGE_ERROR'
} as const;

// Logger utility
export class ApiLogger {
	private static generateRequestId(): string {
		return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
	}

	static logRequest(event: RequestEvent, additionalData?: any) {
		const requestId = this.generateRequestId();
		const logData = {
			requestId,
			method: event.request.method,
			url: event.url.pathname,
			userAgent: event.request.headers.get('user-agent'),
			ip: event.getClientAddress(),
			timestamp: new Date().toISOString(),
			...additionalData
		};

		console.log(`📨 API Request: ${logData.method} ${logData.url}`, logData);
		return requestId;
	}

	static logResponse(
		requestId: string,
		statusCode: number,
		responseTime: number,
		additionalData?: any
	) {
		const logData = {
			requestId,
			statusCode,
			responseTime: `${responseTime}ms`,
			timestamp: new Date().toISOString(),
			...additionalData
		};

		const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
		const emoji = statusCode >= 500 ? '❌' : statusCode >= 400 ? '⚠️' : '✅';

		console[level](`${emoji} API Response: ${statusCode} (${responseTime}ms)`, logData);
	}

	static logError(requestId: string, error: any, context?: string) {
		const logData = {
			requestId,
			error: {
				message: error?.message || 'Unknown error',
				stack: error?.stack,
				name: error?.name
			},
			context,
			timestamp: new Date().toISOString()
		};

		console.error('💥 API Error:', logData);
	}
}

// Response utilities
export class ApiResponse {
	static success<T>(data: T, status: number = HTTP_STATUS.OK, requestId?: string): Response {
		const response: ApiSuccessResponse<T> = {
			success: true,
			data,
			timestamp: new Date().toISOString(),
			requestId
		};

		return json(response, { status });
	}

	static error(
		code: string,
		message: string,
		status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
		details?: any,
		requestId?: string
	): Response {
		const response: ApiErrorResponse = {
			success: false,
			error: {
				code,
				message,
				details
			},
			timestamp: new Date().toISOString(),
			requestId
		};

		return json(response, { status });
	}

	static validationError(message: string, details?: any, requestId?: string): Response {
		return this.error(
			ERROR_CODES.VALIDATION_ERROR,
			message,
			HTTP_STATUS.BAD_REQUEST,
			details,
			requestId
		);
	}

	static notFound(resource: string = 'Resource', requestId?: string): Response {
		return this.error(
			ERROR_CODES.NOT_FOUND,
			`${resource} not found`,
			HTTP_STATUS.NOT_FOUND,
			undefined,
			requestId
		);
	}

	static databaseError(details?: any, requestId?: string): Response {
		return this.error(
			ERROR_CODES.DATABASE_ERROR,
			'Database operation failed',
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
			details,
			requestId
		);
	}

	static storageError(details?: any, requestId?: string): Response {
		return this.error(
			ERROR_CODES.STORAGE_ERROR,
			'Storage operation failed',
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
			details,
			requestId
		);
	}

	static serviceUnavailable(service: string, requestId?: string): Response {
		return this.error(
			ERROR_CODES.SERVICE_UNAVAILABLE,
			`${service} is temporarily unavailable`,
			HTTP_STATUS.SERVICE_UNAVAILABLE,
			undefined,
			requestId
		);
	}
}

// Error handling wrapper
export async function withApiHandler<T>(
	event: RequestEvent,
	handler: () => Promise<T>,
	context?: string
): Promise<Response> {
	const startTime = Date.now();
	let requestId: string | undefined;

	try {
		requestId = ApiLogger.logRequest(event, { context });

		const result = await handler();
		const responseTime = Date.now() - startTime;

		ApiLogger.logResponse(requestId, HTTP_STATUS.OK, responseTime, { context });

		return ApiResponse.success(result, HTTP_STATUS.OK, requestId);
	} catch (error) {
		ApiLogger.logError(requestId || 'unknown', error, context);

		// Handle different error types
		if (error instanceof Response) {
			// Already a proper API response
			return error;
		}

		if (error instanceof Error) {
			// Database errors
			if (error.message.includes('no such table') || error.message.includes('SQLITE_')) {
				return ApiResponse.databaseError({ originalError: error.message }, requestId);
			}

			// Storage errors
			if (error.message.includes('R2') || error.message.includes('storage')) {
				return ApiResponse.storageError({ originalError: error.message }, requestId);
			}

			// Validation errors
			if (error.message.includes('validation') || error.message.includes('required')) {
				return ApiResponse.validationError(
					error.message,
					{ originalError: error.message },
					requestId
				);
			}
		}

		// Generic internal error
		return ApiResponse.error(
			ERROR_CODES.INTERNAL_ERROR,
			'An unexpected error occurred',
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
			{ originalError: error instanceof Error ? error.message : 'Unknown error' },
			requestId
		);
	}
}

// Validation utilities
export class Validation {
	static required(value: any, fieldName: string): void {
		if (value === undefined || value === null || value === '') {
			throw new Error(`${fieldName} is required`);
		}
	}

	static string(value: any, fieldName: string): string {
		if (typeof value !== 'string') {
			throw new Error(`${fieldName} must be a string`);
		}
		return value;
	}

	static number(value: any, fieldName: string): number {
		const num = Number(value);
		if (isNaN(num)) {
			throw new Error(`${fieldName} must be a valid number`);
		}
		return num;
	}

	static uuid(value: any, fieldName: string): string {
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		const str = this.string(value, fieldName);
		if (!uuidRegex.test(str)) {
			throw new Error(`${fieldName} must be a valid UUID`);
		}
		return str;
	}

	static oneOf<T>(value: any, allowedValues: T[], fieldName: string): T {
		if (!allowedValues.includes(value)) {
			throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
		}
		return value;
	}
}
