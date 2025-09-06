import type { RequestEvent } from '@sveltejs/kit';
import { imageGenerator } from '$lib/server/ai/simple-image-generator';
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
					// Using Fal.ai nano-banana (94% cheaper than OpenAI)
					const imageStream = imageGenerator.generateImageStream({
						prompt: validatedBody.prompt,
						personaId: validatedBody.personaId,
						tableId: validatedBody.tableId
					});

					let partialCount = 0;

					// Process streaming events
					for await (const event of imageStream) {
						if (event.type === 'partial') {
							partialCount++;
							// Send partial progress event
							const data = JSON.stringify({
								type: 'partial',
								index: partialCount,
								progress: event.progress,
								timestamp: Date.now()
							});

							controller.enqueue(encoder.encode(`event: partial\n`));
							controller.enqueue(encoder.encode(`data: ${data}\n\n`));
						} else if (event.type === 'completed') {
							// Send completion event with image URL
							const data = JSON.stringify({
								type: 'completed',
								imageUrl: event.imageUrl || '',
								personaId: validatedBody.personaId,
								tableId: validatedBody.tableId,
								timestamp: Date.now()
							});

							// Check if we actually have image data
							if (!event.imageUrl) {
								console.error('No image URL in completed event');
							}

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
