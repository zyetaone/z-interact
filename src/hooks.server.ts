import type { Handle } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import { imageStorage } from '$lib/server/image-storage';

// Initialize image storage on server start
let storageInitialized = false;

const handleAuth: Handle = async ({ event, resolve }) => {
	// Initialize image storage on first request
	if (!storageInitialized) {
		await imageStorage.initialize();
		storageInitialized = true;
	}

	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await auth.validateSessionToken(sessionToken);

	if (session) {
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};

export const handle: Handle = handleAuth;
