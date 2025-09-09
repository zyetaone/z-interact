import { generateImage, editImage } from '../../routes/table/ai.remote';

export type GenerationTask = {
	result: Promise<{ imageUrl: string }>;
	readonly progress: number;
	cancel: () => void;
	readonly isActive: boolean;
};

export type EditTask = {
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
	let isActive = $state(true);
	let progress = $state(0);

	// Progress simulation with intervals
	const progressInterval = setInterval(() => {
		if (!isActive) return;
		// Increment progress more slowly as it approaches completion
		if (progress < 70) {
			progress += Math.random() * 15 + 5; // 5-20% increments early on
		} else if (progress < 90) {
			progress += Math.random() * 5 + 2; // 2-7% increments near end
		}
		// Cap at 90% until actual completion
		if (progress > 90) progress = 90;
	}, 800);

	// Promise-based generation with progress simulation
	const result = (async () => {
		try {
			// Make the actual API call
			const response = await generateImage({ prompt, personaId, tableId });
			// Complete the progress and cleanup
			clearInterval(progressInterval);
			progress = 100;
			isActive = false;
			return { imageUrl: response.data.imageUrl };
		} catch (err) {
			// Cleanup on error
			clearInterval(progressInterval);
			isActive = false;
			throw err;
		}
	})();

	// Return reactive getters for Svelte 5
	return {
		result,
		get progress() {
			return Math.round(progress);
		},
		get isActive() {
			return isActive;
		},
		cancel: () => {
			clearInterval(progressInterval);
			isActive = false;
		}
	};
}

export function createEditTask(
	imageUrl: string,
	editPrompt: string,
	personaId?: string,
	tableId?: string
): EditTask {
	let isActive = $state(true);
	let progress = $state(0);

	// Progress simulation with intervals (faster for edits)
	const progressInterval = setInterval(() => {
		if (!isActive) return;
		// Increment progress more quickly for edits (typically faster than generation)
		if (progress < 60) {
			progress += Math.random() * 20 + 10; // 10-30% increments early on
		} else if (progress < 85) {
			progress += Math.random() * 10 + 5; // 5-15% increments near end
		}
		// Cap at 85% until actual completion
		if (progress > 85) progress = 85;
	}, 600);

	// Promise-based edit with progress simulation
	const result = (async () => {
		try {
			// Make the actual API call
			const response = await editImage({ imageUrl, editPrompt, personaId, tableId });
			// Complete the progress and cleanup
			clearInterval(progressInterval);
			progress = 100;
			isActive = false;
			return { imageUrl: response.imageUrl };
		} catch (err) {
			// Cleanup on error
			clearInterval(progressInterval);
			isActive = false;
			throw err;
		}
	})();

	// Return reactive getters for Svelte 5
	return {
		result,
		get progress() {
			return Math.round(progress);
		},
		get isActive() {
			return isActive;
		},
		cancel: () => {
			clearInterval(progressInterval);
			isActive = false;
		}
	};
}
