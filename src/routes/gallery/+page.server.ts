import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { images } from '$lib/server/db/schema';
import { desc, gt } from 'drizzle-orm';

export const load: PageServerLoad = async ({ platform }) => {
	try {
		const database = getDb(platform);
		
		// Load initial images immediately
		const initialImages = await database
			.select()
			.from(images)
			.orderBy(desc(images.createdAt))
			.limit(50); // Limit initial load for performance

		// Create a streaming promise for updates
		const updates = createUpdateStream(database);

		return {
			images: initialImages,
			updates // This promise will stream new images as they arrive
		};
	} catch (error) {
		console.error('Failed to load gallery:', error);
		return {
			images: [],
			updates: Promise.resolve([])
		};
	}
};

// Function to continuously check for new images
async function createUpdateStream(database: any): Promise<any[]> {
	const checkInterval = 3000; // Check every 3 seconds
	const maxWaitTime = 30000; // Maximum 30 seconds before returning empty
	const startTime = Date.now();
	
	// Get the latest image timestamp to compare against
	const latestImages = await database
		.select()
		.from(images)
		.orderBy(desc(images.createdAt))
		.limit(1);
	
	const lastTimestamp = latestImages.length > 0 
		? new Date(latestImages[0].createdAt).getTime()
		: Date.now();

	while (Date.now() - startTime < maxWaitTime) {
		// Wait before checking
		await new Promise(resolve => setTimeout(resolve, checkInterval));
		
		try {
			// Check for new images since the last known timestamp
			const newImages = await database
				.select()
				.from(images)
				.where(gt(images.createdAt, new Date(lastTimestamp)))
				.orderBy(desc(images.createdAt));
			
			if (newImages.length > 0) {
				console.log(`📡 Streaming ${newImages.length} new images to client`);
				return newImages; // Return new images to stream to client
			}
		} catch (error) {
			console.error('Error checking for new images:', error);
			break;
		}
	}
	
	// Return empty array if no new images found within max wait time
	console.log('📡 No new images found, streaming complete');
	return [];
}