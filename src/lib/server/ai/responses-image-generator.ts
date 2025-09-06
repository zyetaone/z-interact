import OpenAI from 'openai';
import { env } from '../env';

// Types for the new Responses API
export interface ResponsesImageOptions {
	prompt: string;
	model?: 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4.1';
	previousResponseId?: string; // For multi-turn conversations
	stream?: boolean;
	partialImages?: number;
}

export interface ResponsesImageResult {
	imageBase64: string;
	responseId: string; // Store for follow-up requests
	provider: string;
	prompt: string;
	metadata?: Record<string, any>;
}

export interface ResponsesStreamEvent {
	type: 'partial_image' | 'completed' | 'error';
	imageBase64?: string;
	partialImageIndex?: number;
	responseId?: string;
	error?: string;
}

export class ResponsesImageGenerator {
	private client: OpenAI | null = null;

	constructor() {
		if (env.OPENAI_API_KEY) {
			const config: any = { apiKey: env.OPENAI_API_KEY };
			if (env.OPENAI_ORG) config.organization = env.OPENAI_ORG;
			this.client = new OpenAI(config);
		}
	}

	/**
	 * Generate image using the new Responses API
	 */
	async generateImage(options: ResponsesImageOptions): Promise<ResponsesImageResult> {
		if (!this.client) {
			throw new Error('OpenAI API key not configured');
		}

		try {
			console.log(`Generating image with ${options.model || 'gpt-5'} via Responses API...`);

			// Build the input based on whether this is a follow-up
			const input = options.previousResponseId
				? [
						{
							role: 'user',
							content: [{ type: 'input_text', text: options.prompt }]
						},
						{
							type: 'previous_response',
							id: options.previousResponseId
						}
					]
				: options.prompt;

			// Use the responses.create API with image_generation tool
			const response = await (this.client as any).responses.create({
				model: options.model || 'gpt-5',
				input: input,
				tools: [{ type: 'image_generation' }]
			});

			// Extract image data from the response
			const imageGenerationCalls = response.output.filter(
				(output: any) => output.type === 'image_generation_call'
			);

			if (imageGenerationCalls.length === 0) {
				throw new Error('No image generated in response');
			}

			const imageBase64 = imageGenerationCalls[0].result;

			return {
				imageBase64,
				responseId: response.id,
				provider: 'openai-responses',
				prompt: options.prompt,
				metadata: {
					model: options.model || 'gpt-5',
					hasFollowUp: !!options.previousResponseId
				}
			};
		} catch (error: any) {
			console.error('Responses API generation failed:', error);

			// Check if it's a model availability error
			if (error?.message?.includes('responses.create')) {
				console.log('Responses API not available, falling back to legacy generator');
				throw new Error('Responses API not available - use legacy generator');
			}

			throw error;
		}
	}

	/**
	 * Generate image with streaming support
	 */
	async *generateImageStream(options: ResponsesImageOptions): AsyncGenerator<ResponsesStreamEvent> {
		if (!this.client) {
			yield {
				type: 'error',
				error: 'OpenAI client not configured'
			};
			return;
		}

		try {
			console.log(`Starting streaming with ${options.model || 'gpt-4.1'}...`);

			// For streaming, we need gpt-4.1 or compatible model
			const streamModel = options.model === 'gpt-5' ? 'gpt-4.1' : options.model || 'gpt-4.1';

			// Create streaming request
			const stream = await (this.client as any).responses.create({
				model: streamModel,
				input: options.prompt,
				stream: true,
				tools: [
					{
						type: 'image_generation',
						partial_images: options.partialImages || 2
					}
				]
			});

			let responseId: string | undefined;

			// Process streaming events
			for await (const event of stream) {
				if (event.type === 'response.image_generation_call.partial_image') {
					// Partial image event
					yield {
						type: 'partial_image',
						imageBase64: event.partial_image_b64,
						partialImageIndex: event.partial_image_index
					};
				} else if (event.type === 'response.done') {
					// Get the final response ID for follow-ups
					responseId = event.response?.id;

					// Extract final image
					const imageGenerationCalls = event.response?.output?.filter(
						(output: any) => output.type === 'image_generation_call'
					);

					if (imageGenerationCalls?.length > 0) {
						yield {
							type: 'completed',
							imageBase64: imageGenerationCalls[0].result,
							responseId: responseId
						};
					}
				}
			}
		} catch (error: any) {
			console.error('Streaming generation failed:', error);
			yield {
				type: 'error',
				error: error?.message || 'Unknown streaming error'
			};
		}
	}

	/**
	 * Perform a follow-up edit on a previous image
	 */
	async editImage(previousResponseId: string, editPrompt: string): Promise<ResponsesImageResult> {
		return this.generateImage({
			prompt: editPrompt,
			previousResponseId: previousResponseId,
			model: 'gpt-5'
		});
	}
}

// Export singleton instance
export const responsesImageGenerator = new ResponsesImageGenerator();
