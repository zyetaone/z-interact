import { writable } from 'svelte/store';

// Gallery-specific state management
export interface GalleryImage {
	id: string;
	personaId: string;
	personaTitle: string;
	imageUrl: string;
	prompt: string;
	provider: string;
	createdAt: string;
	isLoading?: boolean;
	error?: string;
}

// Create stores for gallery state
export const galleryImages = writable<GalleryImage[]>([]);
export const isGalleryLoading = writable(true);
export const galleryError = writable<string | null>(null);
export const lastUpdate = writable<Date | null>(null);

// Actions for managing gallery state
export const galleryActions = {
	// Initialize gallery
	async initialize() {
		console.log('🎨 Initializing gallery store...');
		isGalleryLoading.set(true);
		galleryError.set(null);

		try {
			const response = await fetch('/api/images');
			if (response.ok) {
				const images = await response.json();
				console.log('📸 Loaded images:', images.length);

				// Convert to gallery format with loading states
				const galleryImagesData: GalleryImage[] = images.map((img: any) => ({
					id: img.id,
					personaId: img.personaId,
					personaTitle: img.personaTitle,
					imageUrl: img.imageUrl,
					prompt: img.prompt,
					provider: img.provider,
					createdAt: img.createdAt,
					isLoading: false,
					error: null
				}));

				galleryImages.set(galleryImagesData);
				lastUpdate.set(new Date());
			} else {
				throw new Error(`Failed to load images: ${response.status}`);
			}
		} catch (error) {
			console.error('❌ Gallery initialization failed:', error);
			galleryError.set(error instanceof Error ? error.message : 'Failed to load gallery');
		} finally {
			isGalleryLoading.set(false);
		}
	},

	// Add new image (prevent duplicates)
	addImage(image: GalleryImage) {
		galleryImages.update(images => {
			// Check if image already exists
			const existingIndex = images.findIndex(img => img.id === image.id);
			if (existingIndex >= 0) {
				// Update existing image
				images[existingIndex] = image;
				return [...images];
			} else {
				// Add new image at the beginning
				return [image, ...images];
			}
		});
		lastUpdate.set(new Date());
	},

	// Update image loading state
	setImageLoading(imageId: string, loading: boolean) {
		galleryImages.update(images =>
			images.map(img =>
				img.id === imageId
					? { ...img, isLoading: loading }
					: img
			)
		);
	},

	// Set image error
	setImageError(imageId: string, error: string) {
		galleryImages.update(images =>
			images.map(img =>
				img.id === imageId
					? { ...img, error, isLoading: false }
					: img
			)
		);
	},

	// Clear all images
	clearImages() {
		galleryImages.set([]);
		lastUpdate.set(new Date());
	},

	// Get image by ID
	getImage(imageId: string) {
		let result: GalleryImage | undefined;
		galleryImages.subscribe(images => {
			result = images.find(img => img.id === imageId);
		})();
		return result;
	},

	// Get images by persona
	getImagesByPersona(personaId: string) {
		let result: GalleryImage[] = [];
		galleryImages.subscribe(images => {
			result = images.filter(img => img.personaId === personaId);
		})();
		return result;
	},

	// Get gallery statistics
	getStats() {
		let images: GalleryImage[] = [];
		galleryImages.subscribe(imgs => images = imgs)();

		const totalImages = images.length;
		const personas = new Set(images.map(img => img.personaId)).size;
		const providers = new Set(images.map(img => img.provider));

		return {
			totalImages,
			totalPersonas: personas,
			providers: Array.from(providers),
			imagesByProvider: images.reduce((acc, img) => {
				acc[img.provider] = (acc[img.provider] || 0) + 1;
				return acc;
			}, {} as Record<string, number>)
		};
	}
};

// Derived stores for computed values
import { derived } from 'svelte/store';

export const galleryStats = derived(galleryImages, $images => {
	const totalImages = $images.length;
	const personas = new Set($images.map(img => img.personaId)).size;
	const providers = new Set($images.map(img => img.provider));

	return {
		totalImages,
		totalPersonas: personas,
		providers: Array.from(providers),
		imagesByProvider: $images.reduce((acc, img) => {
			acc[img.provider] = (acc[img.provider] || 0) + 1;
			return acc;
		}, {} as Record<string, number>)
	};
});

export const hasImages = derived(galleryImages, $images => $images.length > 0);
export const loadingImages = derived(galleryImages, $images => $images.filter(img => img.isLoading));
export const failedImages = derived(galleryImages, $images => $images.filter(img => img.error));