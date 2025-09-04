import type { LockedImage } from '$lib/config.svelte';

// Store with database persistence
class WorkspaceStore {
	private lockedImages = $state<LockedImage[]>([]);
	private isGenerating = $state<Record<string, boolean>>({});
	private initialized = false;

	get images() {
		return this.lockedImages;
	}

	get generatingStatus() {
		return this.isGenerating;
	}

	isPersonaGenerating(personaId: string) {
		return this.isGenerating[personaId] || false;
	}

	setGenerating(personaId: string, generating: boolean) {
		this.isGenerating[personaId] = generating;
	}

	async initialize() {
		if (this.initialized) return;
		await this.loadImages();
		this.initialized = true;
	}

	private async loadImages() {
		try {
			const response = await fetch('/api/images');
			if (response.ok) {
				const images = await response.json();
				this.lockedImages = images.map((img: any) => ({
					tableId: img.tableId,
					personaId: img.personaId,
					imageUrl: img.imageUrl,
					prompt: img.prompt,
					lockedAt: new Date(img.createdAt).toISOString()
				}));
			}
		} catch (error) {
			this.lockedImages = [];
		}
	}

	async lockImage(image: LockedImage) {
		try {
			const response = await fetch('/api/images', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(image)
			});

			if (!response.ok) throw new Error('Failed to lock image');

			// Update local state
			this.lockedImages = this.lockedImages.filter((img) => img.personaId !== image.personaId);
			this.lockedImages.push(image);
			this.isGenerating[image.personaId] = false;

			return image;
		} catch (error) {
			throw error;
		}
	}

	getLockedImage(personaId: string) {
		return this.lockedImages.find((img) => img.personaId === personaId);
	}

	getLockedImageByTable(tableId: string) {
		return this.lockedImages.find((img) => img.tableId === tableId);
	}

	getLockedImageByPersonaAndTable(personaId: string, tableId: string) {
		return this.lockedImages.find((img) => img.personaId === personaId && img.tableId === tableId);
	}

	async refreshImages() {
		await this.loadImages();
	}

	// Generate image using API
	async generateImage(
		personaId: string,
		prompt: string,
		tableId?: string
	): Promise<{ imageUrl: string }> {
		this.setGenerating(personaId, true);

		try {
			const response = await fetch('/api/images', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ prompt, personaId, tableId })
			});

			if (!response.ok) {
				throw new Error('Failed to generate image');
			}

			const data = await response.json();
			this.setGenerating(personaId, false);

			// Return image URL for both display and database storage
			return {
				imageUrl: data.imageUrl
			};
		} catch (error) {
			this.setGenerating(personaId, false);
			throw error;
		}
	}
}

export const workspaceStore = new WorkspaceStore();
