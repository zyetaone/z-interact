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

	// Simple promise-based generation - no fake progress
	const result = (async () => {
		try {
			// Make the actual API call
			const response = await generateImage({ prompt, personaId, tableId });
			isActive = false;
			return { imageUrl: response.data.imageUrl };
		} catch (err) {
			isActive = false;
			throw err;
		}
	})();

	// Return reactive getters for Svelte 5
	return {
		result,
		get progress() {
			// Simple: 0 while loading, 100 when done
			return isActive ? 0 : 100;
		},
		get isActive() {
			return isActive;
		},
		cancel: () => {
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

	// Simple promise-based edit - no fake progress
	const result = (async () => {
		try {
			// Make the actual API call
			const response = await editImage({ imageUrl, editPrompt, personaId, tableId });
			isActive = false;
			return { imageUrl: response.imageUrl };
		} catch (err) {
			isActive = false;
			throw err;
		}
	})();

	// Return reactive getters for Svelte 5
	return {
		result,
		get progress() {
			// Simple: 0 while loading, 100 when done
			return isActive ? 0 : 100;
		},
		get isActive() {
			return isActive;
		},
		cancel: () => {
			isActive = false;
		}
	};
}
