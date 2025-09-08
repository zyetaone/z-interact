import type { Handle, HandleValidationError } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';

const handleInit: Handle = async ({ event, resolve }) => {
	// Basic server initialization - no storage dependency needed
	return resolve(event);
};

export const handle: Handle = handleInit;

// Handle validation errors for remote functions
export const handleValidationError: HandleValidationError = ({ event, issues }) => {
	// Log the validation issues for monitoring
	logger.warn('Validation error in remote function', {
		component: 'Server',
		operation: 'validation',
		path: event.url.pathname,
		issueCount: issues.length
	});

	// Don't expose internal validation details to potential attackers
	// Return a generic error message
	return {
		message: 'Invalid request data provided'
	};
};
