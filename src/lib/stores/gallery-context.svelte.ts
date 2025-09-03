import { getContext, setContext } from 'svelte';
import { galleryImages, isGalleryLoading, galleryError, galleryActions, galleryStats } from './gallery.svelte';

// Context key for type safety
const GALLERY_CONTEXT_KEY = Symbol('gallery-context');

// Gallery context interface
interface GalleryContext {
	// Reactive state
	images: any[];
	isLoading: boolean;
	error: string | null;
	stats: any;

	// Actions
	initialize: () => Promise<void>;
	addImage: (image: any) => void;
	setImageError: (id: string, error: string) => void;
	clearImages: () => void;
}

// Import types from gallery store
import type { GalleryImage } from './gallery.svelte';

// Create gallery context store
function createGalleryContext(): GalleryContext {
	// Use Svelte 5 reactive state
	let images = $state<GalleryImage[]>([]);
	let isLoading = $state<boolean>(true);
	let error = $state<string | null>(null);
	let stats = $state<any>({});

	// Subscribe to existing stores (but don't mutate them directly)
	$effect(() => {
		const unsubImages = galleryImages.subscribe((current: GalleryImage[]) => images = current);
		const unsubLoading = isGalleryLoading.subscribe((current: boolean) => isLoading = current);
		const unsubError = galleryError.subscribe((current: string | null) => error = current);
		const unsubStats = galleryStats.subscribe((current: any) => stats = current);

		return () => {
			unsubImages();
			unsubLoading();
			unsubError();
			unsubStats();
		};
	});

	// Actions that delegate to the original store
	async function initialize() {
		await galleryActions.initialize();
	}

	function addImage(image: any) {
		galleryActions.addImage(image);
	}

	function setImageError(id: string, error: string) {
		galleryActions.setImageError(id, error);
	}

	function clearImages() {
		galleryActions.clearImages();
	}

	return {
		images,
		isLoading,
		error,
		stats,
		initialize,
		addImage,
		setImageError,
		clearImages
	};
}

// Context provider function
export function setGalleryContext() {
	const context = createGalleryContext();
	setContext(GALLERY_CONTEXT_KEY, context);
	return context;
}

// Context consumer function
export function getGalleryContext(): GalleryContext {
	const context = getContext(GALLERY_CONTEXT_KEY) as GalleryContext;
	if (!context) {
		throw new Error('Gallery context not found. Make sure to call setGalleryContext() in a parent component.');
	}
	return context;
}

// Helper hook for components that need gallery context
export function useGallery() {
	return getGalleryContext();
}