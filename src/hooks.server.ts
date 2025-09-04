import type { Handle } from '@sveltejs/kit';

const handleInit: Handle = async ({ event, resolve }) => {
	// Basic server initialization - no storage dependency needed
	return resolve(event);
};

export const handle: Handle = handleInit;
