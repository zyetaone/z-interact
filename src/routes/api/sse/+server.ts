import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sseManager } from '$lib/server/sse-manager';

export async function GET({ request }) {
	const clientId = crypto.randomUUID();

	// Create SSE stream
	const stream = new ReadableStream({
		start(controller) {
			// Store client connection
			sseManager.addClient(clientId, {
				controller,
				lastActivity: Date.now()
			});

			// Send initial connection message
			const initMessage = `data: ${JSON.stringify({
				type: 'connected',
				data: { clientId },
				timestamp: Date.now()
			})}\n\n`;

			controller.enqueue(new TextEncoder().encode(initMessage));
			console.log(`🔗 New SSE client connected: ${clientId}`);
		},
		cancel() {
			sseManager.removeClient(clientId);
			console.log(`🔌 SSE client disconnected: ${clientId}`);
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'Cache-Control',
		},
	});
}

// broadcastMessage is already exported above
// clients is exported for use in other API routes