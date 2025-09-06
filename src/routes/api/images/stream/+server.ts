import type { RequestEvent } from '@sveltejs/kit';
import { imageGenerator } from '$lib/server/ai/simple-image-generator';
import { object, string, optional, parse } from 'valibot';
import { createR2Storage, R2Storage } from '$lib/server/r2-storage';
import { getDb } from '$lib/server/db';
import { images } from '$lib/server/db/schema';
import type { NewImage } from '$lib/server/db/schema';

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

				// Check if image generator is configured
				if (!imageGenerator.isAvailable()) {
					const errorData = JSON.stringify({
						type: 'error',
						error: 'Fal.ai not configured. Please set FAL_API_KEY environment variable.',
						timestamp: Date.now()
					});
					controller.enqueue(encoder.encode(`event: error\n`));
					controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
					controller.close();
					return;
				}

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
							let finalImageUrl = event.imageUrl || '';
							
							// Check if we actually have image data
							if (!event.imageUrl) {
								console.error('No image URL in completed event');
							} else {
								try {
									// Upload to R2 for permanent storage
									const r2Storage = createR2Storage(event.platform);
									const filename = R2Storage.generateFilename(validatedBody.personaId, 'png');
									
									console.log('Uploading to R2 storage from streaming...');
									const uploadResult = await r2Storage.uploadImageFromUrl(event.imageUrl, filename);
									
									if (uploadResult.success && uploadResult.url) {
										finalImageUrl = uploadResult.url;
										console.log('Image uploaded to R2 successfully:', finalImageUrl);
										
										// Save to database
										const database = getDb(event.platform);
										const newImage: NewImage = {
											id: crypto.randomUUID(),
											tableId: validatedBody.tableId || null,
											personaId: validatedBody.personaId,
											personaTitle: validatedBody.personaId
												.replace('-', ' ')
												.replace(/\b\w/g, (l) => l.toUpperCase()),
											sessionId: null,
											participantId: null,
											imageUrl: finalImageUrl,
											prompt: validatedBody.prompt,
											provider: 'fal.ai/nano-banana',
											status: 'completed',
											createdAt: new Date(),
											updatedAt: new Date()
										};
										
										await database.insert(images).values(newImage);
										console.log('Image saved to database from streaming');
									} else {
										console.warn('R2 upload failed in streaming, using Fal.ai URL:', uploadResult.error);
									}
								} catch (error) {
									console.error('Failed to upload to R2 or save to DB in streaming:', error);
									// Continue with original Fal.ai URL
								}
							}
							
							// Send completion event with final URL
							const data = JSON.stringify({
								type: 'completed',
								imageUrl: finalImageUrl,
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
