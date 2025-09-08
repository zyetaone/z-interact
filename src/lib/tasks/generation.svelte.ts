import { generateImage } from '../../routes/table/ai.remote';

export type GenerationTask = {
	result: Promise<{ imageUrl: string }>;
	readonly progress: number;
	cancel: () => void;
	readonly isActive: boolean;
};

export function createGenerationTask(
	personaId: string,
	prompt: string,
	tableId?: string
): GenerationTask {
	let progress = $state(0);
	let cancelFlag = false;
	let isActive = $state(true);

	// Simple promise-based generation without fake streaming
	const result = (async () => {
		try {
			// Simulate progress updates while waiting
			const progressInterval = setInterval(() => {
				if (progress < 90 && !cancelFlag) {
					progress = Math.min(90, progress + Math.random() * 20);
				}
			}, 500);

			// Make the actual API call
			const response = await generateImage({ prompt, personaId, tableId });

			// Clear progress interval and set to 100%
			clearInterval(progressInterval);

			if (cancelFlag) {
				throw new Error('Generation cancelled');
			}

			progress = 100;
			isActive = false;

			return { imageUrl: response.imageUrl };
		} catch (err) {
			isActive = false;
			progress = 0;
			throw err;
		}
	})();

	// Return reactive getters for Svelte 5
	return {
		result,
		get progress() {
			// This getter will be reactive because progress is $state
			return Math.round(progress);
		},
		get isActive() {
			// This getter will be reactive because isActive is $state
			return isActive;
		},
		cancel: () => {
			cancelFlag = true;
			isActive = false;
			progress = 0;
		}
	};
}
