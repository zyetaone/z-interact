import type { Handle } from '@sveltejs/kit';
import { imageStorage } from '$lib/server/image-storage';

// Initialize image storage on server start
let storageInitialized = false;

const handleAuth: Handle = async ({ event, resolve }) => {
	// Initialize image storage on first request
	if (!storageInitialized) {
		await imageStorage.initialize();
		storageInitialized = true;
	}

	// For now, skip auth to avoid database connection issues at startup
	// The main app doesn't require authentication for presentation functionality
	event.locals.user = null;
	event.locals.session = null;
	
	return resolve(event);
};

export const handle: Handle = handleAuth;
