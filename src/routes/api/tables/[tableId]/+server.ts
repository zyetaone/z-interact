import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { images } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { getCorsHeaders, createOptionsResponse } from '$lib/server/cors';

export async function DELETE(event: RequestEvent) {
	const corsHeaders = getCorsHeaders(event.request.headers.get('origin'));
	try {
		const { params, platform } = event;
		const tableId = params.tableId;

		if (!tableId) {
			return json({ error: 'Table ID is required' }, { status: 400, headers: corsHeaders });
		}

		const database = getDb(platform);

		// Delete images for this specific table
		const result = await database.delete(images).where(eq(images.tableId, tableId));

		console.log(`✅ Deleted images for table ${tableId}`);

		return json({
			message: `Images for table ${tableId} deleted successfully`,
			tableId: tableId
		}, { headers: corsHeaders });
	} catch (error) {
		console.error('❌ Failed to delete images:', error);
		return json({ error: 'Failed to delete images' }, { status: 500, headers: corsHeaders });
	}
}

// Handle preflight OPTIONS requests
export async function OPTIONS(event: RequestEvent) {
	return createOptionsResponse(event.request.headers.get('origin'));
}
