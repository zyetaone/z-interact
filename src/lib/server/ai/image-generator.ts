import { fal } from '@fal-ai/client';
import { env } from '../env';
import { logger, devLog } from '$lib/utils/logger';
import type {
	Platform,
	FalLogEntry,
	ImageGenerationOptions,
	ImageGenerationResult
} from '$lib/types';
// Progress store removed from server path; progress is logged but not persisted server-side

export interface ImageEditOptions {
	imageUrl: string;
	editPrompt: string;
	personaId?: string;
	tableId?: string;
}

export type ImageGenerationOptionsWithProgress = ImageGenerationOptions;

/**
 * Image Generator using Fal.ai nano-banana model
 * Optimized for architectural/workspace visualizations
 * Cost: ~$0.0025 per image
 */
export class ImageGenerator {
	private isConfigured: boolean = false;
	private apiKey: string | undefined;

	constructor(platform?: Platform) {
		// Get API key from platform or fallback to env
		this.apiKey =
			(typeof platform?.env?.['FAL_API_KEY '] === 'string'
				? platform.env['FAL_API_KEY ']
				: undefined) ||
			(typeof platform?.env?.FAL_API_KEY === 'string' ? platform.env.FAL_API_KEY : undefined) ||
			env.FAL_API_KEY;

		if (this.apiKey) {
			fal.config({
				credentials: this.apiKey
			});
			this.isConfigured = true;
			devLog('Fal.ai configured with nano-banana model', { component: 'ImageGenerator' });
		} else {
			logger.warn('FAL_API_KEY not configured', { component: 'ImageGenerator' });
		}
	}

	/**
	 * Configure with platform-specific environment
	 */
	configureWithPlatform(platform: Platform) {
		const platformKey =
			(typeof platform?.env?.['FAL_API_KEY '] === 'string'
				? platform.env['FAL_API_KEY ']
				: undefined) ||
			(typeof platform?.env?.FAL_API_KEY === 'string' ? platform.env.FAL_API_KEY : undefined);
		if (platformKey && platformKey !== this.apiKey) {
			this.apiKey = platformKey;
			fal.config({
				credentials: platformKey
			});
			this.isConfigured = true;
			devLog('Fal.ai reconfigured with platform API key', { component: 'ImageGenerator' });
		}
	}

	/**
	 * Generate an architectural workspace image with real-time progress updates
	 */
	async generateImage(options: ImageGenerationOptionsWithProgress): Promise<ImageGenerationResult> {
		if (!this.isConfigured) {
			logger.warn('Fal.ai API key not configured, using placeholder images', {
				component: 'ImageGenerator',
				prompt: options.prompt?.substring(0, 50)
			});
			return this.generatePlaceholder(options.prompt);
		}

		logger.debug('Starting image generation', {
			component: 'ImageGenerator',
			prompt: options.prompt?.substring(0, 50),
			personaId: options.personaId
		});

		try {
			// Build the enhanced prompt for architectural visualization
			const enhancedPrompt = this.enhancePrompt(options.prompt, options.personaId);

			const result = await fal.subscribe('fal-ai/nano-banana', {
				input: {
					prompt: enhancedPrompt,
					num_images: 1,
					output_format: 'jpeg'
				},
				logs: true,
				onQueueUpdate: (update) => {
					const logs = 'logs' in update && update.logs ? update.logs.map((log: FalLogEntry) => log.message) : [];
					devLog('Fal.ai progress update', {
						component: 'ImageGenerator',
						status: update.status,
						logs
					});
				}
			});

			// Get the image URL from the result - Fal.ai returns result.data.images array
			const imageUrl =
				result.data?.images?.[0]?.url ||
				(result as { images?: { url: string }[] }).images?.[0]?.url;
			if (!imageUrl) {
				logger.error('No image URL in Fal.ai response', {
					component: 'ImageGenerator',
					response: JSON.stringify(result, null, 2)
				});
				throw new Error('No image URL in response');
			}

			logger.debug('Image generation completed');

			return {
				imageUrl,
				provider: 'fal.ai/nano-banana',
				prompt: options.prompt,
				metadata: {
					model: 'nano-banana',
					requestId: result.requestId,
					enhancedPrompt,
					cost: 0.0025
				}
			};
		} catch (error: unknown) {
			const errorObj = error as {
				message?: string;
				status?: number;
				body?: unknown;
				stack?: string;
			};

			logger.error(
				'Image generation failed',
				{
					component: 'ImageGenerator',
					error: errorObj?.message,
					status: errorObj?.status,
					prompt: options.prompt?.substring(0, 50)
				},
				error instanceof Error ? error : new Error(String(error))
			);

			// If API key is invalid or network error, throw to let the endpoint handle it
			if (
				errorObj?.message?.includes('API key') ||
				errorObj?.message?.includes('401') ||
				errorObj?.message?.includes('403')
			) {
				throw new Error(`Fal.ai authentication failed: ${errorObj.message}`);
			}

			// For other errors, return a placeholder as fallback
			logger.warn('Falling back to placeholder image due to generation error', {
				component: 'ImageGenerator',
				originalError: errorObj?.message
			});
			return this.generatePlaceholder(options.prompt);
		}
	}

	/**
	 * Edit an existing image using Fal.ai nano-banana/edit model
	 */
	async editImage(options: ImageEditOptions): Promise<ImageGenerationResult> {
		if (!this.isConfigured) {
			logger.warn('Fal.ai API key not configured, cannot edit images', {
				component: 'ImageGenerator'
			});
			throw new Error('Image editing requires API configuration');
		}

		logger.debug('Starting image edit', {
			component: 'ImageGenerator',
			editPrompt: options.editPrompt?.substring(0, 50),
			personaId: options.personaId
		});

		try {
			devLog('Starting image edit with Fal.ai nano-banana/edit', {
				component: 'ImageGenerator',
				editPrompt: options.editPrompt?.substring(0, 100)
			});

			// Call Fal.ai nano-banana/edit endpoint
			const result = await fal.subscribe('fal-ai/nano-banana/edit', {
				input: {
					prompt: options.editPrompt,
					image_urls: [options.imageUrl],
					num_images: 1,
					output_format: 'jpeg'
				},
				logs: true,
				onQueueUpdate: (update: any) => {
					if (update.status === 'IN_PROGRESS' && update.logs) {
						update.logs.forEach((log: FalLogEntry) => {
							devLog(log.message, {
								component: 'ImageGenerator:Edit',
								level: log.level,
								timestamp: log.timestamp
							});
						});
					}
				}
			});

			const editedUrl = result.data?.images?.[0]?.url;
			const description = result.data?.description || 'Image edited successfully';

			if (!editedUrl) {
				throw new Error('No edited image returned from API');
			}

			logger.debug('Image generation completed');

			return {
				imageUrl: editedUrl,
				provider: 'fal.ai/nano-banana/edit',
				prompt: options.editPrompt,
				metadata: {
					model: 'nano-banana/edit',
					generationTime: new Date().toISOString(),
					requestId: result.requestId,
					description,
					editMode: true,
					originalUrl: options.imageUrl
				}
			};
		} catch (error: any) {
			logger.debug('Image generation completed');

			logger.error(
				'Image edit failed',
				{
					component: 'ImageGenerator',
					error: error?.message,
					editPrompt: options.editPrompt?.substring(0, 50)
				},
				error instanceof Error ? error : new Error(String(error))
			);

			throw new Error(`Failed to edit image: ${error?.message || 'Unknown error'}`);
		}
	}

	/**
	 * Enhance the prompt with architectural specifications
	 */
	private enhancePrompt(basePrompt: string, personaId?: string): string {
		// Add architectural visualization prefix if not already present
		if (!basePrompt.toLowerCase().includes('architectural')) {
			basePrompt = `Architectural visualization: ${basePrompt}`;
		}

		// Add rendering specifications
		const specs = [
			'Photorealistic architectural photography style',
			'Wide-angle perspective showing complete workspace',
			'Natural daylight through windows',
			'Clean visual without any text, labels, logos, or watermarks',
			'Focus on architectural details and spatial flow'
		];

		return `${basePrompt}\n\nRender specifications: ${specs.join('. ')}.`;
	}

	/**
	 * Generate a placeholder image as fallback
	 */
	private generatePlaceholder(prompt: string): ImageGenerationResult {
		const imageUrl = `https://picsum.photos/1024/1024?random=${Date.now()}`;

		return {
			imageUrl,
			provider: 'placeholder',
			prompt,
			metadata: {
				fallback: true,
				reason: 'Fal.ai generation failed'
			}
		};
	}

	/**
	 * Check if the generator is configured
	 */
	isAvailable(): boolean {
		return this.isConfigured;
	}

	/**
	 * Get user-friendly status message from Fal.ai status
	 */
	private getStatusMessage(status: string, queuePosition?: number): string {
		switch (status) {
			case 'IN_QUEUE':
				return queuePosition ? `In queue (position ${queuePosition})` : 'Waiting in queue';
			case 'IN_PROGRESS':
				return 'Generating image...';
			case 'COMPLETED':
				return 'Generation complete';
			case 'ERROR':
				return 'Generation failed';
			default:
				return 'Processing...';
		}
	}
}

// Export singleton instance (will be configured at runtime)
export const imageGenerator = new ImageGenerator();

// Factory function for creating configured instances
export function createImageGenerator(platform?: Platform): ImageGenerator {
	const generator = new ImageGenerator(platform);
	return generator;
}
