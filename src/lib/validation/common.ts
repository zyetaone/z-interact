import * as v from 'valibot';

/**
 * Shared validation utilities and schemas
 * Consolidates common validation patterns used across the application
 */

// Common validation patterns
export const ValidationPatterns = {
	personaId: /^(baby-boomer|gen-x|millennial|gen-z|gen-alpha)$/,
	tableId: /^([1-9]|10)$/,
	url: /^https?:\/\/.+/,
	uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
	imageStatus: /^(generating|active|uploaded|locked|failed)$/,
	imageProvider: /^(openai|dall-e-3|placeholder|upload|fal(\.ai)?.*)$/
};

// Reusable validation pipes
export const personaIdPipe = v.pipe(
	v.string('PersonaId must be a string'),
	v.regex(
		ValidationPatterns.personaId,
		'Invalid persona ID. Must be one of: baby-boomer, gen-x, millennial, gen-z, gen-alpha'
	)
);

export const tableIdPipe = v.pipe(
	v.string('TableId must be a string'),
	v.regex(ValidationPatterns.tableId, 'TableId must be between 1-10')
);

export const optionalTableIdPipe = v.optional(tableIdPipe);

export const urlPipe = v.pipe(v.string('URL must be a string'), v.url('URL must be a valid URL'));

export const optionalUrlPipe = v.optional(urlPipe);

export const promptPipe = v.pipe(
	v.string('Prompt must be a string'),
	v.minLength(10, 'Prompt must be at least 10 characters')
);

export const requiredStringPipe = (fieldName: string, minLength = 1) =>
	v.pipe(
		v.string(`${fieldName} must be a string`),
		v.minLength(minLength, `${fieldName} must be at least ${minLength} characters`)
	);

// Additional validation pipes for images
export const imageStatusPipe = v.pipe(
	v.string('Status must be a string'),
	v.regex(ValidationPatterns.imageStatus, 'Invalid image status')
);

export const imageProviderPipe = v.pipe(
	v.string('Provider must be a string'),
	v.regex(ValidationPatterns.imageProvider, 'Invalid image provider')
);

export const timestampPipe = v.pipe(
	v.number('Timestamp must be a number'),
	v.minValue(0, 'Timestamp must be positive'),
	v.maxValue(Date.now() + 86400000, 'Timestamp cannot be more than 1 day in the future')
);

export const limitPipe = v.pipe(
	v.number('Limit must be a number'),
	v.minValue(1, 'Limit must be at least 1'),
	v.maxValue(100, 'Limit cannot exceed 100')
);

export const optionalLimitPipe = v.optional(limitPipe);

// UUID validation pipe
export const uuidPipe = v.pipe(
	v.string('ID must be a string'),
	v.regex(ValidationPatterns.uuid, 'Invalid UUID format')
);

// Common validation functions
export function validatePersonaId(personaId: string): boolean {
	return ValidationPatterns.personaId.test(personaId);
}

export function validateTableId(tableId: string): boolean {
	return ValidationPatterns.tableId.test(tableId);
}

export function validateUrl(url: string): boolean {
	return ValidationPatterns.url.test(url);
}

export function validateUuid(uuid: string): boolean {
	return ValidationPatterns.uuid.test(uuid);
}

export function validateImageStatus(status: string): boolean {
	return ValidationPatterns.imageStatus.test(status);
}

export function validateImageProvider(provider: string): boolean {
	return ValidationPatterns.imageProvider.test(provider);
}

// Error messages
export const ValidationMessages = {
	INVALID_PERSONA_ID:
		'Invalid persona ID. Must be one of: baby-boomer, gen-x, millennial, gen-z, gen-alpha',
	INVALID_TABLE_ID: 'Invalid table ID. Must be between 1-10',
	INVALID_URL: 'Invalid URL format',
	INVALID_UUID: 'Invalid UUID format',
	INVALID_STATUS: 'Invalid image status',
	INVALID_PROVIDER: 'Invalid image provider',
	INVALID_TIMESTAMP: 'Invalid timestamp',
	REQUIRED_FIELD: (field: string) => `${field} is required`,
	MIN_LENGTH: (field: string, min: number) => `${field} must be at least ${min} characters`,
	MAX_LENGTH: (field: string, max: number) => `${field} must not exceed ${max} characters`,
	NOT_FOUND: (resource: string) => `${resource} not found`,
	SERVER_ERROR: 'Internal server error',
	RATE_LIMIT: 'Rate limit exceeded',
	UNAUTHORIZED: 'Unauthorized access'
};

// Alias for backward compatibility with api-utils
export const ErrorMessages = ValidationMessages;

// Type-safe validation result
export type ValidationResult<T> = { success: true; data: T } | { success: false; error: string };

// Generic validation helper
export function validate<T>(
	schema: v.BaseSchema<T, unknown, v.BaseIssue<unknown>>,
	data: unknown
): ValidationResult<T> {
	try {
		const result = v.parse(schema, data);
		return { success: true, data: result as T };
	} catch (error) {
		if (error instanceof v.ValiError) {
			return { success: false, error: error.issues[0]?.message || 'Validation failed' };
		}
		return { success: false, error: 'Unknown validation error' };
	}
}
