import {
	MASTER_SYSTEM_PROMPT,
	DEFAULT_PROMPT_FIELDS,
	type PromptFields,
	type PromptFieldConfig
} from './promptConfig.svelte';

export type { PromptFields };

export interface Persona {
	id: string;
	title: string;
	description: string;
	promptStructure: PromptFieldConfig[];
}

export interface Table {
	id: string; // e.g., '1', '2'
	displayName: string; // e.g., 'Table 1'
	personaId: string;
}

export interface AppConfig {
	masterSystemPrompt: string;
	personas: Record<string, Persona>;
	tables: Table[];
}

export interface LockedImage {
	tableId: string;
	personaId: string;
	imageUrl: string;
	prompt: string;
	lockedAt?: string;
}

// Default configuration data - now DRY with shared field definitions
const defaultConfig: AppConfig = {
	masterSystemPrompt: MASTER_SYSTEM_PROMPT,

	personas: {
		'baby-boomer': {
			id: 'baby-boomer',
			title: 'Baby Boomer Executive',
			description:
				'68-year-old executive, CEO/Board Member, London, UK. Experienced leader with a focus on traditional office hierarchies, valuing stability and face-to-face collaboration, but open to modern tech integration for efficiency.',
			promptStructure: DEFAULT_PROMPT_FIELDS
		},
		'gen-x': {
			id: 'gen-x',
			title: 'Generation X Entrepreneur',
			description:
				'55-year-old serial entrepreneur, jaded from city life, Europe. Pragmatic innovator who prefers flexible workspaces and has seen multiple office trends, seeking a balance between remote work and in-person networking.',
			promptStructure: DEFAULT_PROMPT_FIELDS
		},
		'millennial': {
			id: 'millennial',
			title: 'Millennial R&D Head',
			description:
				'38-year-old Head of R&D, Semiconductor MNC, America. Tech-savvy and purpose-driven, advocates for sustainable designs and advanced tech like AI tools, with a strong emphasis on collaborative and inclusive office cultures.',
			promptStructure: DEFAULT_PROMPT_FIELDS
		},
		'gen-z': {
			id: 'gen-z',
			title: 'Gen Z Startup Founder',
			description:
				'27-year-old AI Startup Founder, India. Digital native with a passion for cutting-edge technology, favoring agile, community-focused spaces with virtual reality and wearable tech integrations.',
			promptStructure: DEFAULT_PROMPT_FIELDS
		},
		'gen-alpha': {
			id: 'gen-alpha',
			title: 'Gen Alpha Student Innovator',
			description:
				'15-year-old student innovator, tech enthusiast, Singapore. Future-focused and highly adaptable, imagines offices with immersive tech (e.g., AR/VR), gamified work environments, and a strong emphasis on mental wellbeing and balance.',
			promptStructure: DEFAULT_PROMPT_FIELDS
		}
	},

	tables: [
		{ id: '1', displayName: 'Table 1', personaId: 'baby-boomer' },
		{ id: '2', displayName: 'Table 2', personaId: 'gen-x' },
		{ id: '3', displayName: 'Table 3', personaId: 'millennial' },
		{ id: '4', displayName: 'Table 4', personaId: 'gen-z' },
		{ id: '5', displayName: 'Table 5', personaId: 'gen-alpha' },
		{ id: '6', displayName: 'Table 6', personaId: 'gen-alpha' },
		{ id: '7', displayName: 'Table 7', personaId: 'millennial' },
		{ id: '8', displayName: 'Table 8', personaId: 'gen-z' },
		{ id: '9', displayName: 'Table 9', personaId: 'gen-x' },
		{ id: '10', displayName: 'Table 10', personaId: 'baby-boomer' }
	]
};

// Create reactive state
export const globalConfig = $state(defaultConfig);

export function getPersonaById(id: string): Persona | undefined {
	return globalConfig.personas[id];
}

export function getTableById(id: string): Table | undefined {
	return globalConfig.tables.find((table) => table.id === id);
}

export function getPersonaByTableId(tableId: string): Persona | undefined {
	const table = getTableById(tableId);
	return table ? getPersonaById(table.personaId) : undefined;
}

// Locked images management
const defaultLockedImages: LockedImage[] = [];
export const lockedImages = $state(defaultLockedImages);

export function lockImage(tableId: string, personaId: string, imageUrl: string, prompt: string) {
	const existingIndex = lockedImages.findIndex((img) => img.tableId === tableId);
	const newImage: LockedImage = {
		tableId,
		personaId,
		imageUrl,
		prompt,
		lockedAt: new Date().toISOString()
	};

	if (existingIndex >= 0) {
		lockedImages[existingIndex] = newImage;
	} else {
		lockedImages.push(newImage);
	}
}

export function unlockImage(tableId: string) {
	const index = lockedImages.findIndex((img) => img.tableId === tableId);
	if (index >= 0) {
		lockedImages.splice(index, 1);
	}
}

export function getLockedImage(tableId: string): LockedImage | undefined {
	return lockedImages.find((img) => img.tableId === tableId);
}

// Config update functions
export function updatePersonaTitle(personaId: string, title: string) {
	if (globalConfig.personas[personaId]) {
		globalConfig.personas[personaId].title = title;
	}
}

export function updatePersonaDescription(personaId: string, description: string) {
	if (globalConfig.personas[personaId]) {
		globalConfig.personas[personaId].description = description;
	}
}
