import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import { db } from '$lib/server/db';
import { users, authSessions } from '$lib/server/db/schema';
import { hash, verify } from '@node-rs/argon2';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	const token = encodeBase64url(bytes);
	return token;
}

export async function createUser(email: string, password: string, role: 'admin' | 'presenter' | 'participant' = 'participant') {
	const passwordHash = await hash(password);

	const [user] = await db.insert(users).values({
		id: crypto.randomUUID(),
		email,
		passwordHash,
		role,
		createdAt: new Date(),
		updatedAt: new Date(),
	}).returning();

	return user;
}

export async function authenticateUser(email: string, password: string) {
	const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

	if (!user) {
		return null;
	}

	const isValidPassword = await verify(user.passwordHash, password);
	if (!isValidPassword) {
		return null;
	}

	return {
		id: user.id,
		email: user.email,
		role: user.role,
	};
}

export async function createSession(token: string, userId: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + DAY_IN_MS * 30)
	};
	await db.insert(authSessions).values(session);
	return session;
}

export async function validateSessionToken(token: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const [result] = await db
		.select({
			user: {
				id: users.id,
				email: users.email,
				role: users.role
			},
			session: authSessions
		})
		.from(authSessions)
		.innerJoin(users, eq(authSessions.userId, users.id))
		.where(eq(authSessions.id, sessionId));

	if (!result) {
		return { session: null, user: null };
	}
	const { session, user } = result;

	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await db.delete(authSessions).where(eq(authSessions.id, session.id));
		return { session: null, user: null };
	}

	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		await db
			.update(authSessions)
			.set({ expiresAt: session.expiresAt })
			.where(eq(authSessions.id, session.id));
	}

	return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string) {
	await db.delete(authSessions).where(eq(authSessions.id, sessionId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'strict'
	});
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, {
		path: '/'
	});
}

// Initialize default admin user if none exists
export async function initializeDefaultUser() {
	try {
		const existingUsers = await db.select().from(users).limit(1);

		if (existingUsers.length === 0) {
			console.log('🚀 Creating default admin user...');
			await createUser('admin@z-interact.com', 'admin123', 'admin');
			console.log('✅ Default admin user created: admin@z-interact.com / admin123');
		}
	} catch (error) {
		console.error('Failed to initialize default user:', error);
	}
}
