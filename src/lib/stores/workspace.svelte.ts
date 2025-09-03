import type { LockedImage } from '$lib/config';

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
					personaTitle: img.personaTitle,
					imageUrl: img.imageUrl,
					prompt: img.prompt,
					lockedAt: new Date(img.createdAt).toISOString()
				}));
			}
		} catch (error) {
			console.error('Failed to load images:', error);
			this.lockedImages = [];
		}
	}

	async lockImage(image: LockedImage) {
		try {
			const response = await fetch('/api/images', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...image,
					provider: 'placeholder',
					status: 'completed'
				})
			});

			if (!response.ok) throw new Error('Failed to lock image');

			// Update local state
			this.lockedImages = this.lockedImages.filter(img => img.personaId !== image.personaId);
			this.lockedImages.push(image);
			this.isGenerating[image.personaId] = false;

			return image;
		} catch (error) {
			console.error('Failed to lock image:', error);
			throw error;
		}
	}

	getLockedImage(personaId: string) {
		return this.lockedImages.find(img => img.personaId === personaId);
	}

	async refreshImages() {
		await this.loadImages();
	}

	// Generate image using API
	async generateImage(personaId: string, prompt: string): Promise<{imageUrl: string, originalUrl: string}> {
		this.setGenerating(personaId, true);

		try {
			const response = await fetch('/api/generate-image', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ prompt, personaId })
			});

			if (!response.ok) {
				throw new Error('Failed to generate image');
			}

			const data = await response.json();
			this.setGenerating(personaId, false);
			
			// Return both URLs - data URL for display, original URL for database
			return {
				imageUrl: data.imageUrl, // data URL for immediate display
				originalUrl: data.originalUrl || data.imageUrl // original URL for database storage
			};

		} catch (error) {
			this.setGenerating(personaId, false);
			throw error;
		}
	}
}

export const workspaceStore = new WorkspaceStore();
