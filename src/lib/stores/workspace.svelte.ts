import type { LockedImage } from '$lib/personas';

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
		if (this.initialized) {
			console.log('Workspace store already initialized');
			return;
		}

		console.log('Initializing workspace store...');

		try {
			const response = await fetch('/api/images');
			console.log('API response status:', response.status);

			if (response.ok) {
				const images = await response.json();
				console.log('Received images from API:', images.length);

				// Convert database format to app format
				this.lockedImages = images.map((img: any) => ({
					personaId: img.personaId,
					personaTitle: img.personaTitle,
					imageUrl: img.imageUrl,
					prompt: img.prompt,
					lockedAt: new Date(img.createdAt).toISOString()
				}));

				console.log('Converted images:', this.lockedImages.length);
			} else {
				console.error('Failed to load images: HTTP', response.status);
			}
		} catch (error) {
			console.error('Failed to load images:', error);
			// Initialize with empty array on error
			this.lockedImages = [];
		}

		this.initialized = true;
		console.log('Workspace store initialization complete');
	}

	async lockImage(image: LockedImage) {
		try {
			const response = await fetch('/api/images', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...image,
					provider: 'placeholder',
					status: 'completed'
				})
			});

			if (!response.ok) {
				throw new Error('Failed to lock image');
			}

			const result = await response.json();

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
		try {
			const response = await fetch('/api/images');
			if (response.ok) {
				const images = await response.json();
				// Convert database format to app format
				this.lockedImages = images.map((img: any) => ({
					personaId: img.personaId,
					personaTitle: img.personaTitle,
					imageUrl: img.imageUrl,
					prompt: img.prompt,
					lockedAt: new Date(img.createdAt).toISOString()
				}));
			}
		} catch (error) {
			console.error('Failed to refresh images:', error);
		}
	}

	// Generate image using API
	async generateImage(personaId: string, prompt: string): Promise<string> {
		this.setGenerating(personaId, true);

		try {
			const response = await fetch('/api/generate-image', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ prompt, personaId })
			});

			if (!response.ok) {
				throw new Error('Failed to generate image');
			}

			const data = await response.json();
			this.setGenerating(personaId, false);
			return data.imageUrl;

		} catch (error) {
			this.setGenerating(personaId, false);
			throw error;
		}
	}
}

export const workspaceStore = new WorkspaceStore();