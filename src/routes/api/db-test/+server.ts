import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { images } from '$lib/server/db/schema';

export async function GET({ platform }) {
	try {
		console.log('🧪 Testing database connection...');
		console.log('Platform env available:', !!platform?.env);
		console.log('D1 binding available:', !!platform?.env?.z_interact_db);
		
		const database = getDb(platform);
		
		// Try a simple count query
		const result = await database.select().from(images).limit(1);
		
		return json({
			success: true,
			message: 'Database connection successful',
			sampleCount: result.length,
			usingD1: !!platform?.env?.z_interact_db,
			bindingName: platform?.env?.z_interact_db ? 'z_interact_db' : 'local'
		});
	} catch (error) {
		console.error('❌ Database test failed:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			usingD1: !!platform?.env?.z_interact_db
		}, { status: 500 });
	}
}