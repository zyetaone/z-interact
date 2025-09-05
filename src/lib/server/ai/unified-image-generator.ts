import OpenAI from 'openai';
import { env } from '../env';
import { ImageGenerator, type ImageGenerationOptions, type ImageGenerationResult } from './image-generator';
import { ResponsesImageGenerator, type ResponsesImageOptions, type ResponsesImageResult } from './responses-image-generator';

export type GeneratorMode = 'legacy' | 'responses' | 'auto';

export interface UnifiedImageOptions {
	prompt: string;
	mode?: GeneratorMode;
	// Legacy API options
	size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
	quality?: 'high' | 'medium' | 'low' | 'auto';
	background?: 'transparent' | 'opaque' | 'auto';
	// Responses API options
	model?: 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4.1' | 'gpt-image-1' | 'dall-e-3';
	previousResponseId?: string;
	// Common options
	stream?: boolean;
	partialImages?: number;
}

export interface UnifiedImageResult {
	imageUrl?: string;
	imageBase64?: string;
	responseId?: string; // For multi-turn conversations
	provider: string;
	prompt: string;
	metadata?: Record<string, any>;
}

export interface UnifiedStreamEvent {
	type: 'partial_image' | 'completed' | 'error';
	imageBase64?: string;
	partialImageIndex?: number;
	responseId?: string;
	progress?: number;
	error?: string;
}

/**
 * Unified Image Generator that can use both legacy and new Responses API
 */
export class UnifiedImageGenerator {
	private legacyGenerator: ImageGenerator;
	private responsesGenerator: ResponsesImageGenerator;
	private preferredMode: GeneratorMode = 'auto';

	constructor() {
		this.legacyGenerator = new ImageGenerator();
		this.responsesGenerator = new ResponsesImageGenerator();
	}

	/**
	 * Generate an image using the appropriate API
	 */
	async generateImage(options: UnifiedImageOptions): Promise<UnifiedImageResult> {
		const mode = this.determineMode(options);
		console.log(`Using ${mode} mode for image generation`);

		if (mode === 'responses') {
			return this.generateWithResponsesAPI(options);
		} else {
			return this.generateWithLegacyAPI(options);
		}
	}

	/**
	 * Generate image with streaming
	 */
	async *generateImageStream(options: UnifiedImageOptions): AsyncGenerator<UnifiedStreamEvent> {
		const mode = this.determineMode(options);
		console.log(`Using ${mode} mode for streaming generation`);

		if (mode === 'responses') {
			yield* this.streamWithResponsesAPI(options);
		} else {
			yield* this.streamWithLegacyAPI(options);
		}
	}

	/**
	 * Edit a previously generated image (Responses API only)
	 */
	async editImage(responseId: string, editPrompt: string): Promise<UnifiedImageResult> {
		try {
			const result = await this.responsesGenerator.editImage(responseId, editPrompt);
			return {
				imageBase64: result.imageBase64,
				responseId: result.responseId,
				provider: result.provider,
				prompt: editPrompt,
				metadata: result.metadata
			};
		} catch (error) {
			console.error('Edit failed, generating new image instead:', error);
			// Fall back to generating a new image
			return this.generateImage({ prompt: editPrompt });
		}
	}

	/**
	 * Determine which API mode to use
	 */
	private determineMode(options: UnifiedImageOptions): 'legacy' | 'responses' {
		// Explicit mode requested
		if (options.mode && options.mode !== 'auto') {
			return options.mode;
		}

		// Multi-turn requires Responses API
		if (options.previousResponseId) {
			return 'responses';
		}

		// GPT-5 models require Responses API
		if (options.model?.startsWith('gpt-5') || options.model === 'gpt-4.1') {
			return 'responses';
		}

		// Legacy models use legacy API
		if (options.model === 'gpt-image-1' || options.model === 'dall-e-3') {
			return 'legacy';
		}

		// Auto mode: try Responses API first, fall back to legacy
		if (this.preferredMode === 'auto') {
			// Default to legacy for stability
			return 'legacy';
		}

		return this.preferredMode === 'responses' ? 'responses' : 'legacy';
	}

	/**
	 * Generate using Responses API
	 */
	private async generateWithResponsesAPI(options: UnifiedImageOptions): Promise<UnifiedImageResult> {
		try {
			const responsesOptions: ResponsesImageOptions = {
				prompt: options.prompt,
				model: options.model as any || 'gpt-5',
				previousResponseId: options.previousResponseId,
				stream: false,
				partialImages: options.partialImages
			};

			const result = await this.responsesGenerator.generateImage(responsesOptions);

			// Convert to data URL if needed
			const imageUrl = `data:image/png;base64,${result.imageBase64}`;

			return {
				imageUrl,
				imageBase64: result.imageBase64,
				responseId: result.responseId,
				provider: result.provider,
				prompt: options.prompt,
				metadata: {
					...result.metadata,
					apiMode: 'responses'
				}
			};
		} catch (error: any) {
			console.error('Responses API failed, falling back to legacy:', error);
			// Fall back to legacy API
			return this.generateWithLegacyAPI(options);
		}
	}

	/**
	 * Generate using Legacy API
	 */
	private async generateWithLegacyAPI(options: UnifiedImageOptions): Promise<UnifiedImageResult> {
		const legacyOptions: ImageGenerationOptions = {
			prompt: options.prompt,
			size: options.size || '1024x1024',
			quality: options.quality || 'low',
			background: options.background || 'auto',
			stream: false
		};

		const result = await this.legacyGenerator.generateImage(legacyOptions);

		// Ensure we have an image URL
		let imageUrl = result.imageUrl;
		if (!imageUrl && result.b64_json) {
			imageUrl = `data:image/png;base64,${result.b64_json}`;
		}

		return {
			imageUrl,
			imageBase64: result.b64_json,
			provider: result.provider,
			prompt: options.prompt,
			metadata: {
				...result.metadata,
				apiMode: 'legacy'
			}
		};
	}

	/**
	 * Stream using Responses API
	 */
	private async *streamWithResponsesAPI(options: UnifiedImageOptions): AsyncGenerator<UnifiedStreamEvent> {
		try {
			const responsesOptions: ResponsesImageOptions = {
				prompt: options.prompt,
				model: options.model as any || 'gpt-4.1',
				stream: true,
				partialImages: options.partialImages || 2
			};

			const stream = this.responsesGenerator.generateImageStream(responsesOptions);

			for await (const event of stream) {
				if (event.type === 'partial_image') {
					yield {
						type: 'partial_image',
						imageBase64: event.imageBase64,
						partialImageIndex: event.partialImageIndex,
						progress: ((event.partialImageIndex || 0) + 1) * 33 // Estimate progress
					};
				} else if (event.type === 'completed') {
					yield {
						type: 'completed',
						imageBase64: event.imageBase64,
						responseId: event.responseId,
						progress: 100
					};
				} else if (event.type === 'error') {
					yield {
						type: 'error',
						error: event.error
					};
				}
			}
		} catch (error: any) {
			console.error('Responses streaming failed, falling back to legacy:', error);
			// Fall back to legacy streaming
			yield* this.streamWithLegacyAPI(options);
		}
	}

	/**
	 * Stream using Legacy API
	 */
	private async *streamWithLegacyAPI(options: UnifiedImageOptions): AsyncGenerator<UnifiedStreamEvent> {
		const legacyOptions: ImageGenerationOptions = {
			prompt: options.prompt,
			size: options.size || '1024x1024',
			quality: options.quality || 'low',
			background: options.background || 'auto',
			stream: true,
			partial_images: options.partialImages
		};

		const stream = this.legacyGenerator.generateImageStream(legacyOptions);

		for await (const event of stream) {
			if (event.type === 'completed' && event.b64_json) {
				yield {
					type: 'completed',
					imageBase64: event.b64_json,
					progress: 100
				};
			} else if (event.type === 'error') {
				yield {
					type: 'error',
					error: event.error
				};
			}
		}
	}

	/**
	 * Set the preferred API mode
	 */
	setPreferredMode(mode: GeneratorMode) {
		this.preferredMode = mode;
		console.log(`Image generator mode set to: ${mode}`);
	}
}

// Export singleton instance
export const unifiedImageGenerator = new UnifiedImageGenerator();