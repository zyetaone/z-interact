import type { RequestEvent } from '@sveltejs/kit';
import { AppError, ErrorType, ErrorSeverity } from '$lib/types';
import { getCorsHeaders } from '$lib/server/cors';
import { getErrorMessage, ERROR_MESSAGES } from '$lib/utils/error-handler';

// Get appropriate HTTP status code for error type
function getHttpStatusForError(errorType: ErrorType): number {
	switch (errorType) {
		case ErrorType.VALIDATION:
			return 400;
		case ErrorType.AUTHENTICATION:
			return 401;
		case ErrorType.AUTHORIZATION:
			return 403;
		case ErrorType.NOT_FOUND:
			return 404;
		case ErrorType.TIMEOUT:
			return 408;
		case ErrorType.SERVER:
			return 500;
		default:
			return 500;
	}
}

// Handle API errors consistently (server-only)
export function handleApiError(
	error: unknown,
	event: RequestEvent,
	context: string = 'API operation'
): Response {
	const appError =
		error instanceof AppError
			? error
			: new AppError(
					error instanceof Error ? error.message : String(error),
					ErrorType.UNKNOWN,
					ErrorSeverity.MEDIUM,
					undefined,
					{
						originalError: error,
						timestamp: new Date(),
						context
					}
				);

	return new Response(
		JSON.stringify({
			success: false,
			error: appError.message,
			message: getErrorMessage(appError, context),
			type: appError.type,
			severity: appError.severity,
			details: appError.details
		}),
		{
			status: getHttpStatusForError(appError.type),
			headers: {
				'Content-Type': 'application/json',
				...getCorsHeaders(event.request.headers.get('origin'))
			}
		}
	);
}

// Enhanced API response helpers (server-only)
export function createApiSuccessResponse<T>(
	data: T,
	message?: string,
	status: number = 200
): Response {
	return new Response(
		JSON.stringify({
			success: true,
			data,
			message,
			timestamp: new Date().toISOString()
		}),
		{
			status,
			headers: { 'Content-Type': 'application/json' }
		}
	);
}

export function createApiErrorResponse(
	message: string,
	type: ErrorType = ErrorType.UNKNOWN,
	status: number = 500,
	details?: unknown
): Response {
	return new Response(
		JSON.stringify({
			success: false,
			error: message,
			type,
			severity: ERROR_MESSAGES[type].severity,
			details,
			timestamp: new Date().toISOString()
		}),
		{
			status,
			headers: { 'Content-Type': 'application/json' }
		}
	);
}
