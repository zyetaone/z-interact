import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { LockedImage } from '$lib/personas';

const STORAGE_FILE = path.join(process.cwd(), 'data', 'locked-images.json');
const STORAGE_DIR = path.dirname(STORAGE_FILE);

// Ensure data directory exists
import { mkdirSync } from 'fs';
if (!existsSync(STORAGE_DIR)) {
	mkdirSync(STORAGE_DIR, { recursive: true });
}

class ImageStorage {
	private cache: Map<string, LockedImage> = new Map();
	private initialized = false;

	async init() {
		if (this.initialized) return;
		
		try {
			if (existsSync(STORAGE_FILE)) {
				const data = await readFile(STORAGE_FILE, 'utf-8');
				const images = JSON.parse(data) as LockedImage[];
				images.forEach(img => this.cache.set(img.personaId, img));
			}
		} catch (error) {
			console.error('Failed to load storage:', error);
		}
		
		this.initialized = true;
	}

	async save() {
		try {
			const images = Array.from(this.cache.values());
			await writeFile(STORAGE_FILE, JSON.stringify(images, null, 2));
		} catch (error) {
			console.error('Failed to save storage:', error);
		}
	}

	async getAll(): Promise<LockedImage[]> {
		await this.init();
		return Array.from(this.cache.values())
			.sort((a, b) => a.personaId.localeCompare(b.personaId));
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
}

export const imageStorage = new ImageStorage();