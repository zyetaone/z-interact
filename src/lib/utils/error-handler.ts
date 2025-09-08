import { browser } from '$app/environment';
import { AppError, ErrorType, ErrorSeverity, NetworkError } from '$lib/types';
import { toastStore } from '$lib/stores/toast.svelte';

// Re-export types for use by other modules
export type { ApiErrorResponse, ApiSuccessResponse, ApiResponse } from '$lib/types';
export { AppError, ErrorType, ErrorSeverity, NetworkError } from '$lib/types';

// ErrorType is imported from types

// Error message templates for consistency
export const ERROR_MESSAGES = {
	[ErrorType.VALIDATION]: {
		default: 'Please check your input and try again.',
		userMessage: 'Some information needs to be corrected.',
		severity: ErrorSeverity.LOW
	},
	[ErrorType.NETWORK]: {
		default: 'Network connection failed. Please check your internet connection.',
		userMessage: 'Connection problem. Please try again.',
		severity: ErrorSeverity.HIGH
	},
	[ErrorType.SERVER]: {
		default: 'Server error occurred. Please try again later.',
		userMessage: 'Something went wrong on our end. Please try again.',
		severity: ErrorSeverity.HIGH
	},
	[ErrorType.CLIENT]: {
		default: 'An unexpected error occurred.',
		userMessage: 'Something unexpected happened. Please try again.',
		severity: ErrorSeverity.MEDIUM
	},
	[ErrorType.AUTHENTICATION]: {
		default: 'Authentication required.',
		userMessage: 'Please sign in to continue.',
		severity: ErrorSeverity.HIGH
	},
	[ErrorType.AUTHORIZATION]: {
		default: 'Access denied.',
		userMessage: "You don't have permission to perform this action.",
		severity: ErrorSeverity.HIGH
	},
	[ErrorType.NOT_FOUND]: {
		default: 'Resource not found.',
		userMessage: 'The requested item could not be found.',
		severity: ErrorSeverity.MEDIUM
	},
	[ErrorType.TIMEOUT]: {
		default: 'Request timed out.',
		userMessage: 'The request took too long. Please try again.',
		severity: ErrorSeverity.MEDIUM
	},
	[ErrorType.UNKNOWN]: {
		default: 'An unknown error occurred.',
		userMessage: 'Something went wrong. Please try again.',
		severity: ErrorSeverity.MEDIUM
	}
} as const;

// Error handling configuration
export interface ErrorHandlerConfig {
	logToConsole?: boolean;
	showToast?: boolean;
	throwError?: boolean;
	customHandler?: (error: AppError) => void;
	severity?: ErrorSeverity;
}

// Create standardized error object
export function createAppError(
	originalError: unknown,
	type: ErrorType = ErrorType.UNKNOWN,
	context?: string,
	customMessage?: string,
	severity?: ErrorSeverity
): AppError {
	const error = originalError instanceof Error ? originalError : new Error(String(originalError));

	const templates = ERROR_MESSAGES[type];
	const message = customMessage || error.message || templates.default;
	const errorSeverity = severity || templates.severity;

	return new AppError(
		message,
		type,
		errorSeverity,
		undefined,
		{
			originalError: error,
			timestamp: new Date(),
			context
		},
		context
	);
}

// Classify error type based on error characteristics
export function classifyError(error: unknown): ErrorType {
	if (error instanceof AppError) {
		return error.type;
	}

	if (error instanceof Error) {
		const message = error.message.toLowerCase();

		if (message.includes('validation') || message.includes('invalid')) {
			return ErrorType.VALIDATION;
		}
		if (
			message.includes('network') ||
			message.includes('fetch') ||
			message.includes('connection')
		) {
			return ErrorType.NETWORK;
		}
		if (message.includes('unauthorized') || message.includes('401')) {
			return ErrorType.AUTHENTICATION;
		}
		if (message.includes('forbidden') || message.includes('403')) {
			return ErrorType.AUTHORIZATION;
		}
		if (message.includes('not found') || message.includes('404')) {
			return ErrorType.NOT_FOUND;
		}
		if (message.includes('timeout')) {
			return ErrorType.TIMEOUT;
		}
		if (message.includes('500') || message.includes('server error')) {
			return ErrorType.SERVER;
		}
	}

	return ErrorType.UNKNOWN;
}

// Get user-friendly error message
export function getErrorMessage(error: unknown, context?: string): string {
	if (error instanceof AppError) {
		const templates = ERROR_MESSAGES[error.type];
		return templates.userMessage;
	}

	if (error instanceof Error) {
		// Hide technical details from users
		if (error.message.includes('fetch')) {
			return 'Failed to connect to server';
		}
		if (error.message.includes('JSON')) {
			return 'Invalid response from server';
		}
		return context ? `Error in ${context}` : 'An unexpected error occurred';
	}

	return 'An unknown error occurred';
}

// Handle and display error to user
export function handleError(
	error: unknown,
	context?: string,
	config: ErrorHandlerConfig = {}
): AppError {
	const { logToConsole = true, showToast = true, customHandler } = config;

	// Convert to AppError if not already
	const appError =
		error instanceof AppError ? error : createAppError(error, classifyError(error), context);

	// Log error for debugging
	if (browser && logToConsole) {
		console.error(`[${appError.type.toUpperCase()}] ${context || 'Unknown context'}:`, {
			message: appError.message,
			userMessage: getErrorMessage(appError, context),
			details: appError.details,
			timestamp: new Date(),
			severity: appError.severity
		});
	}

	// Show user-friendly toast notification (only in browser)
	if (showToast && browser) {
		const message = getErrorMessage(appError, context);
		toastStore.error(message);
	}

	// Call custom handler if provided
	if (customHandler) {
		customHandler(appError);
	}

	return appError;
}

// Safe async operation wrapper
export async function safeAsync<T>(
	operation: () => Promise<T>,
	context?: string,
	config?: ErrorHandlerConfig
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
	try {
		const data = await operation();
		return { success: true, data };
	} catch (error) {
		const appError = handleError(error, context || 'async operation', config);
		return { success: false, error: appError };
	}
}

// Safe fetch wrapper for API calls
export async function safeFetch<T = unknown>(
	url: string,
	options?: RequestInit,
	context?: string,
	config?: ErrorHandlerConfig
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
	return safeAsync(
		async () => {
			const response = await fetch(url, options);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new NetworkError(
					errorData.message || `HTTP ${response.status}: ${response.statusText}`,
					response.status,
					errorData,
					context
				);
			}

			return await response.json();
		},
		context || `API call to ${url}`,
		config
	);
}

// Retry mechanism for operations
export async function retryAsync<T>(
	operation: () => Promise<T>,
	maxRetries: number = 3,
	delay: number = 1000,
	context?: string
): Promise<T> {
	let lastError: unknown;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;

			if (attempt === maxRetries) {
				// Create a more informative error with context
				const errorMessage = context
					? `Failed after ${maxRetries} attempts: ${context}`
					: `Failed after ${maxRetries} attempts`;
				throw createAppError(error, classifyError(error), context, errorMessage);
			}

			// Wait before retrying
			await new Promise((resolve) => setTimeout(resolve, delay * attempt));
		}
	}

	throw lastError;
}

// Wrap async function with error handling
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	context?: string,
	config?: ErrorHandlerConfig
): T {
	return (async (...args: Parameters<T>) => {
		try {
			return await fn(...args);
		} catch (error) {
			handleError(error, context, config);
			return null;
		}
	}) as T;
}

// Create error boundary wrapper
export function createErrorBoundary(
	context: string,
	config?: ErrorHandlerConfig
): {
	wrap: <T>(fn: () => T) => T | null;
	wrapAsync: <T>(fn: () => Promise<T>) => Promise<T | null>;
} {
	return {
		wrap: (fn) => {
			try {
				return fn();
			} catch (error) {
				handleError(error, context, config);
				return null;
			}
		},
		wrapAsync: async (fn) => {
			try {
				return await fn();
			} catch (error) {
				handleError(error, context, config);
				return null;
			}
		}
	};
}

// Setup global error listeners (call once in app initialization)
export function setupGlobalErrorListeners(): void {
	if (!browser) return;

	// Handle unhandled promise rejections
	window.addEventListener('unhandledrejection', (event) => {
		handleError(event.reason, 'Unhandled Promise Rejection', {
			logToConsole: true,
			showToast: false // Avoid spamming users
		});
	});

	// Handle general JavaScript errors
	window.addEventListener('error', (event) => {
		handleError(event.error, 'JavaScript Error', {
			logToConsole: true,
			showToast: false // Avoid spamming users
		});
	});
}

// Error recovery strategies
export const ErrorRecovery = {
	/**
	 * Retry failed operation with exponential backoff
	 */
	async retry<T>(operation: () => Promise<T>, maxAttempts = 3, baseDelay = 1000): Promise<T> {
		let lastError: Error;

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				if (attempt < maxAttempts - 1) {
					const delay = baseDelay * Math.pow(2, attempt);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		throw lastError!;
	},

	/**
	 * Fallback to alternative value on error
	 */
	async fallback<T>(operation: () => Promise<T>, fallbackValue: T): Promise<T> {
		try {
			return await operation();
		} catch {
			return fallbackValue;
		}
	},

	/**
	 * Circuit breaker pattern
	 */
	createCircuitBreaker<T>(operation: () => Promise<T>, threshold = 5, resetTime = 60000) {
		let failures = 0;
		let lastFailureTime = 0;
		let isOpen = false;

		return async (): Promise<T> => {
			// Check if circuit should be reset
			if (isOpen && Date.now() - lastFailureTime > resetTime) {
				isOpen = false;
				failures = 0;
			}

			// If circuit is open, fail fast
			if (isOpen) {
				throw new AppError(
					'Service temporarily unavailable',
					ErrorType.SERVER,
					ErrorSeverity.CRITICAL,
					'CIRCUIT_OPEN'
				);
			}

			try {
				const result = await operation();
				failures = 0; // Reset on success
				return result;
			} catch (error) {
				failures++;
				lastFailureTime = Date.now();

				if (failures >= threshold) {
					isOpen = true;
				}

				throw error;
			}
		};
	}
};

// SvelteKit remote function error handling
export function handleRemoteError(error: unknown, context: string = 'Remote operation'): never {
	const appError = handleError(error, context, { showToast: true });
	throw appError;
}
