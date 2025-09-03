import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from './index';
import { images, users, authSessions } from './schema';
import { eq } from 'drizzle-orm';

describe('Database Operations', () => {
	beforeEach(async () => {
		// Clean up before each test
		await db.delete(images);
		await db.delete(authSessions);
		await db.delete(users);
	});

	afterEach(async () => {
		// Clean up after each test
		await db.delete(images);
		await db.delete(authSessions);
		await db.delete(users);
	});

	describe('Images', () => {
		it('should create and retrieve an image', async () => {
			const testImage = {
				id: 'test-image-id',
				personaId: 'baby-boomer',
				personaTitle: 'The Baby Boomer',
				imageUrl: 'https://example.com/image.png',
				prompt: 'A modern workspace',
				provider: 'openai' as const,
				status: 'completed' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Insert image
			const [insertedImage] = await db.insert(images).values(testImage).returning();

			expect(insertedImage.id).toBe(testImage.id);
			expect(insertedImage.personaId).toBe(testImage.personaId);
			expect(insertedImage.imageUrl).toBe(testImage.imageUrl);

			// Retrieve image
			const [retrievedImage] = await db.select().from(images).where(eq(images.id, testImage.id));

			expect(retrievedImage).toBeDefined();
			expect(retrievedImage?.personaTitle).toBe('The Baby Boomer');
		});

		it('should list all images ordered by creation date', async () => {
			const image1 = {
				id: 'image-1',
				personaId: 'gen-x',
				personaTitle: 'Gen X',
				imageUrl: 'https://example.com/1.png',
				prompt: 'Workspace 1',
				provider: 'openai' as const,
				status: 'completed' as const,
				createdAt: new Date('2024-01-01'),
				updatedAt: new Date('2024-01-01'),
			};

			const image2 = {
				id: 'image-2',
				personaId: 'millennial',
				personaTitle: 'Millennial',
				imageUrl: 'https://example.com/2.png',
				prompt: 'Workspace 2',
				provider: 'stability' as const,
				status: 'completed' as const,
				createdAt: new Date('2024-01-02'),
				updatedAt: new Date('2024-01-02'),
			};

			await db.insert(images).values([image1, image2]);

			const allImages = await db.select().from(images).orderBy(images.createdAt);

			expect(allImages).toHaveLength(2);
			expect(allImages[0].personaId).toBe('gen-x');
			expect(allImages[1].personaId).toBe('millennial');
		});
	});

	describe('Users', () => {
		it('should create and authenticate a user', async () => {
			const testUser = {
				id: 'test-user-id',
				email: 'test@example.com',
				passwordHash: 'hashed-password',
				role: 'presenter' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Insert user
			const [insertedUser] = await db.insert(users).values(testUser).returning();

			expect(insertedUser.email).toBe(testUser.email);
			expect(insertedUser.role).toBe('presenter');

			// Retrieve user
			const [retrievedUser] = await db.select().from(users).where(eq(users.email, testUser.email));

			expect(retrievedUser).toBeDefined();
			expect(retrievedUser?.role).toBe('presenter');
		});

		it('should enforce unique email constraint', async () => {
			const user1 = {
				id: 'user-1',
				email: 'duplicate@example.com',
				passwordHash: 'hash1',
				role: 'participant' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const user2 = {
				id: 'user-2',
				email: 'duplicate@example.com', // Same email
				passwordHash: 'hash2',
				role: 'participant' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			await db.insert(users).values(user1);

			// This should fail due to unique constraint
			await expect(db.insert(users).values(user2)).rejects.toThrow();
		});
	});

	describe('Sessions', () => {
		it('should create and validate a session', async () => {
			// First create a user
			const testUser = {
				id: 'session-user-id',
				email: 'session@example.com',
				passwordHash: 'hashed-password',
				role: 'presenter' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			await db.insert(users).values(testUser);

			// Create session
			const testSession = {
				id: 'test-session-id',
				userId: testUser.id,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
			};

			await db.insert(authSessions).values(testSession);

			// Validate session with join
			const [sessionWithUser] = await db
				.select({
					session: authSessions,
					user: {
						id: users.id,
						email: users.email,
						role: users.role
					}
				})
				.from(authSessions)
				.innerJoin(users, eq(authSessions.userId, users.id))
				.where(eq(authSessions.id, testSession.id));

			expect(sessionWithUser).toBeDefined();
			expect(sessionWithUser?.user.email).toBe(testUser.email);
			expect(sessionWithUser?.session.expiresAt).toBeInstanceOf(Date);
		});
	});
});