import { fal } from '@fal-ai/client';
import { env } from '../env';

export interface FalImageOptions {
	prompt: string;
	model?: 'flux/schnell' | 'flux/dev' | 'flux-pro'; // schnell is fastest & cheapest
	imageSize?:
		| 'square_hd'
		| 'square'
		| 'portrait_4_3'
		| 'portrait_16_9'
		| 'landscape_4_3'
		| 'landscape_16_9';
	numInferenceSteps?: number; // 1-4 for schnell, more for dev
	seed?: number;
	guidanceScale?: number;
	numImages?: number;
}

export interface FalImageResult {
	imageUrl: string;
	imageBase64?: string;
	provider: string;
	prompt: string;
	metadata?: Record<string, any>;
	cost?: number; // Estimated cost in USD
}

export interface FalStreamEvent {
	type: 'queued' | 'in_progress' | 'completed' | 'error';
	progress?: number;
	imageUrl?: string;
	error?: string;
}

/**
 * Fal.ai Image Generator using FLUX models
 * Significantly cheaper than OpenAI:
 * - FLUX Schnell: ~$0.003 per image (1024x1024, 1-4 steps)
 * - FLUX Dev: ~$0.005-0.01 per image (1024x1024, 20-50 steps)
 * - FLUX Pro: ~$0.02-0.05 per image (premium quality)
 *
 * Compared to OpenAI:
 * - gpt-image-1: $0.01 per image (low quality)
 * - dall-e-3: $0.04-0.08 per image
 */
export class FalImageGenerator {
	private isConfigured: boolean = false;

	constructor() {
		// Configure fal client if API key is available
		if (env.FAL_API_KEY) {
			fal.config({
				credentials: env.FAL_API_KEY
			});
			this.isConfigured = true;
			console.log('✅ Fal.ai client configured');
		} else {
			console.warn('⚠️ FAL_API_KEY not configured - Fal.ai image generation unavailable');
		}
	}

	/**
	 * Generate image using Fal.ai FLUX models
	 */
	async generateImage(options: FalImageOptions): Promise<FalImageResult> {
		if (!this.isConfigured) {
			throw new Error('Fal.ai API key not configured');
		}

		try {
			const model = this.getModelEndpoint(options.model);
			const startTime = Date.now();

			console.log(`🎨 Generating with ${model}...`);

			// Use subscribe for queue-based generation
			const result = await fal.subscribe(model, {
				input: {
					prompt: options.prompt,
					image_size: options.imageSize || 'square_hd', // 1024x1024
					num_inference_steps: options.numInferenceSteps || this.getDefaultSteps(options.model),
					seed: options.seed,
					guidance_scale: options.guidanceScale || 3.5,
					num_images: options.numImages || 1
				},
				logs: true,
				onQueueUpdate: (update) => {
					console.log('Queue update:', update);
				}
			});

			console.log('Fal.ai result structure:', JSON.stringify(result, null, 2));

			const generationTime = ((Date.now() - startTime) / 1000).toFixed(2);
			const estimatedCost = this.estimateCost(options.model, options.imageSize);

			// Get the first generated image - handle different response structures
			// Fal.ai returns result.data.images[0].url
			const imageUrl = result.data?.images?.[0]?.url || result.images?.[0]?.url || result.image?.url || result.url;
			if (!imageUrl) {
				console.error('Fal.ai response missing image URL:', result);
				throw new Error('No image URL in response');
			}

			console.log(`✅ Image generated in ${generationTime}s | Cost: ~$${estimatedCost.toFixed(4)}`);

			return {
				imageUrl,
				provider: 'fal.ai',
				prompt: options.prompt,
				metadata: {
					model: model,
					generationTime: generationTime,
					size: options.imageSize || 'square_hd',
					inferenceSteps: options.numInferenceSteps || this.getDefaultSteps(options.model)
				},
				cost: estimatedCost
			};
		} catch (error: any) {
			console.error('Fal.ai generation failed:', error);
			throw new Error(`Fal.ai generation failed: ${error?.message || 'Unknown error'}`);
		}
	}

	/**
	 * Generate image with streaming updates
	 */
	async *generateImageStream(options: FalImageOptions): AsyncGenerator<FalStreamEvent> {
		if (!this.isConfigured) {
			yield {
				type: 'error',
				error: 'Fal.ai API key not configured'
			};
			return;
		}

		try {
			const model = this.getModelEndpoint(options.model);
			console.log(`🎨 Starting streaming generation with ${model}...`);

			// Create subscription with queue updates
			const result = await fal.subscribe(model, {
				input: {
					prompt: options.prompt,
					image_size: options.imageSize || 'square_hd',
					num_inference_steps: options.numInferenceSteps || this.getDefaultSteps(options.model),
					seed: options.seed,
					guidance_scale: options.guidanceScale || 3.5,
					num_images: 1
				},
				pollInterval: 500, // Poll every 500ms for updates
				logs: true,
				onQueueUpdate: (update) => {
					// This callback doesn't work well with async generators
					// We'll handle updates differently
					console.log('Queue status:', update);
				}
			});

			// Since fal.subscribe doesn't provide real streaming,
			// we'll simulate progress events
			yield {
				type: 'queued',
				progress: 0
			};

			yield {
				type: 'in_progress',
				progress: 50
			};

			// Get the result
			const imageUrl = result.images?.[0]?.url;
			if (!imageUrl) {
				throw new Error('No image URL in response');
			}

			yield {
				type: 'completed',
				imageUrl,
				progress: 100
			};
		} catch (error: any) {
			console.error('Streaming generation error:', error);
			yield {
				type: 'error',
				error: error?.message || 'Unknown error occurred'
			};
		}
	}

	/**
	 * Get the full model endpoint for Fal.ai
	 */
	private getModelEndpoint(model?: string): string {
		switch (model) {
			case 'flux-pro':
				return 'fal-ai/flux-pro/v1.1-ultra'; // Premium quality
			case 'flux/dev':
				return 'fal-ai/flux/dev'; // Better quality, slower
			case 'flux/schnell':
			default:
				return 'fal-ai/flux/schnell'; // Fastest & cheapest
		}
	}

	/**
	 * Get default inference steps for each model
	 */
	private getDefaultSteps(model?: string): number {
		switch (model) {
			case 'flux-pro':
				return 50; // High quality needs more steps
			case 'flux/dev':
				return 28; // Balance of quality and speed
			case 'flux/schnell':
			default:
				return 4; // Ultra-fast, 1-4 steps
		}
	}

	/**
	 * Estimate cost based on model and size
	 * These are rough estimates based on Fal.ai pricing
	 */
	private estimateCost(model?: string, size?: string): number {
		// Base costs per 1024x1024 image
		const baseCosts = {
			'flux/schnell': 0.003, // ~$0.003 per image
			'flux/dev': 0.008, // ~$0.008 per image
			'flux-pro': 0.025 // ~$0.025 per image
		};

		// Size multipliers (larger = more expensive)
		const sizeMultipliers: Record<string, number> = {
			square: 0.8, // 512x512
			square_hd: 1.0, // 1024x1024 (base)
			portrait_4_3: 1.1,
			portrait_16_9: 1.2,
			landscape_4_3: 1.1,
			landscape_16_9: 1.2
		};

		const baseCost = baseCosts[model as keyof typeof baseCosts] || baseCosts['flux/schnell'];
		const sizeMultiplier = sizeMultipliers[size || 'square_hd'] || 1.0;

		return baseCost * sizeMultiplier;
	}

	/**
	 * Check if Fal.ai is configured and available
	 */
	isAvailable(): boolean {
		return this.isConfigured;
	}
}

// Export singleton instance
export const falImageGenerator = new FalImageGenerator();
