import type { RequestEvent } from '@sveltejs/kit';
import { unifiedImageGenerator } from '$lib/server/ai/unified-image-generator';
import { object, string, optional, parse } from 'valibot';

// Validation schema for streaming request
const streamRequestSchema = object({
	prompt: string(),
	personaId: string(),
	tableId: optional(string())
});

export async function POST(event: RequestEvent) {
	console.log('Streaming image generation started');

	try {
		// Parse request body
		const body = await event.request.json();
		const validatedBody = parse(streamRequestSchema, body);

		// Set up SSE headers
		const headers = new Headers({
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no', // Disable Nginx buffering
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		});

		// Create a readable stream for SSE
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();

				try {
					// Start image generation with streaming
					const imageStream = unifiedImageGenerator.generateImageStream({
						prompt: validatedBody.prompt,
						mode: 'legacy', // Use legacy API for gpt-image-1
						model: 'gpt-image-1', // Now verified! $0.01 per image
						size: '1024x1024', // Square format - most cost effective
						quality: 'low', // Low quality for $0.01 per image
						partialImages: 2, // Show progress with partial images
						stream: true
					});

					let partialCount = 0;

					// Process streaming events
					for await (const event of imageStream) {
						if (event.type === 'partial_image') {
							partialCount++;
							// Send partial image event
							const data = JSON.stringify({
								type: 'partial',
								index: event.partialImageIndex ?? partialCount,
								image: event.imageBase64,
								progress: event.progress,
								timestamp: Date.now()
							});

							controller.enqueue(encoder.encode(`event: partial_image\n`));
							controller.enqueue(encoder.encode(`data: ${data}\n\n`));
						} else if (event.type === 'completed') {
							// Send completion event with full image
							const data = JSON.stringify({
								type: 'completed',
								image: event.imageBase64,
								responseId: event.responseId, // Store for multi-turn editing
								personaId: validatedBody.personaId,
								tableId: validatedBody.tableId,
								timestamp: Date.now()
							});

							controller.enqueue(encoder.encode(`event: completed\n`));
							controller.enqueue(encoder.encode(`data: ${data}\n\n`));

							// Close the stream
							controller.close();
						} else if (event.type === 'error') {
							// Send error event
							const data = JSON.stringify({
								type: 'error',
								error: event.error,
								timestamp: Date.now()
							});

							controller.enqueue(encoder.encode(`event: error\n`));
							controller.enqueue(encoder.encode(`data: ${data}\n\n`));

							// Close the stream
							controller.close();
						}
					}
				} catch (error) {
					console.error('Streaming generation error:', error);

					// Send error event
					const data = JSON.stringify({
						type: 'error',
						error: error instanceof Error ? error.message : 'Unknown error occurred',
						timestamp: Date.now()
					});

					controller.enqueue(encoder.encode(`event: error\n`));
					controller.enqueue(encoder.encode(`data: ${data}\n\n`));

					// Close the stream
					controller.close();
				}
			},
			cancel() {
				console.log('Stream cancelled by client');
			}
		});

		return new Response(stream, { headers });
	} catch (error) {
		console.error('Failed to initialize streaming:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to initialize image generation',
				details: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
}

// Handle preflight OPTIONS requests for CORS
export async function OPTIONS() {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Max-Age': '86400'
		}
	});
}
