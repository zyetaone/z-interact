import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { images } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ platform }) => {
	try {
		const database = getDb(platform);

		// Load all images - simplified for Cloudflare Workers compatibility
		const allImages = await database
			.select()
			.from(images)
			.orderBy(desc(images.createdAt))
			.limit(100); // Reasonable limit

		return {
			images: allImages
		};
	} catch (error) {
		return {
			images: []
		};
	}
};
