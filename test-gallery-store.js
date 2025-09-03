// Test the gallery store
import { galleryImages, galleryActions } from './src/lib/stores/gallery.svelte.ts';

console.log('🧪 Testing gallery store...');

// Subscribe to changes
galleryImages.subscribe(images => {
	console.log('📸 Gallery images updated:', images.length);
});

// Test initialization
await galleryActions.initialize();

console.log('✅ Gallery store test complete');