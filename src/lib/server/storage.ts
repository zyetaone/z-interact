import type { LockedImage } from '$lib/config.svelte';

// Cloudflare Workers compatible storage - using in-memory cache only
// Images are persisted in the database, this is just for runtime caching
class ImageStorage {
	private cache: Map<string, LockedImage> = new Map();
	private initialized = false;

	async init() {
		if (this.initialized) return;
		// No file system initialization needed in Cloudflare Workers
		this.initialized = true;
	}

	async save() {
		// No file system operations in Cloudflare Workers
		// Data persistence is handled by the database
	}

	async getAll(): Promise<LockedImage[]> {
		await this.init();
		return Array.from(this.cache.values()).sort((a, b) => a.personaId.localeCompare(b.personaId));
	}

	async set(image: LockedImage): Promise<LockedImage> {
		await this.init();
		this.cache.set(image.personaId, image);
		await this.save();
		return image;
	}

	async get(personaId: string): Promise<LockedImage | undefined> {
		await this.init();
		return this.cache.get(personaId);
	}

	async delete(personaId: string): Promise<boolean> {
		await this.init();
		const result = this.cache.delete(personaId);
		if (result) {
			await this.save();
		}
		return result;
	}

	async clear() {
		await this.init();
		this.cache.clear();
		await this.save();
	}

	// Load cache from database (called externally when needed)
	loadFromDatabase(images: LockedImage[]) {
		this.cache.clear();
		images.forEach((img) => this.cache.set(img.personaId, img));
	}
}

export const imageStorage = new ImageStorage();
