import type { AppConfig, Persona, Table, PromptFieldConfig, PromptFields } from '$lib/types';

// Re-export types for convenience
export type { Persona, Table } from '$lib/types';

// Scene setting - establishes what we're creating
export const SCENE_SETTING = `Full perspective interior design photography, photorealistic architectural visualization: A 2030 corporate workspace interior. Show full workspace, conceptual, larger view. Show larger workspace. Open floor with floor-to-ceiling windows overlooking the cityscape.`;

// Rendering specifications - how to visualize (consolidated)
export const RENDERING_SPECS = `Render specifications: Photorealistic architectural photography style, high quality, 8K resolution. Wide-angle perspective showing complete workspace. Ultra-detailed textures, ray-traced global illumination, cinematic depth of field. <Important>Clean visual without any text, labels, logos, or watermarks. Focus on architectural details and spatial flow. Show full workspace from a larger perspective. Strictly follow the specified color palette and atmosphere.</Important>`;

// Shared field configuration - used by all personas
export const DEFAULT_PROMPT_FIELDS: PromptFieldConfig[] = [
	{
		label: 'What would your office environment look like?',
		field: 'environment',
		fieldSuggestions: {
			placeholder: 'Describe the overall feel and layout of your workspace...',
			suggestions:
				'timeless elegance, futuristic touches, open layouts, no private silos, ergonomic comfort, cognitive well-being'
		}
	},
	{
		label: 'What does your office feature?',
		field: 'features',
		fieldSuggestions: {
			placeholder: 'List the specific facilities and amenities...',
			suggestions:
				'collaborative lounges, flexible workstations, biophilic green zones, digital pods, wellness suites, medium/heavy tech integration'
		}
	},
	{
		label: 'What would your office color palette be?',
		field: 'colorPalette',
		fieldSuggestions: {
			placeholder: 'Describe your mood board and color scheme...',
			suggestions: 'oak wood, marble white, muted greys + accents of brass and navy'
		}
	},
	{
		label: 'What atmosphere and feeling should it create?',
		field: 'atmosphere',
		fieldSuggestions: {
			placeholder: 'Describe the mood and emotional impact...',
			suggestions:
				'inspiring yet calm, energizing but focused, innovative and humane, refined tech-forward sanctuary'
		}
	},
	{
		label: 'What else?',
		field: 'additionalFeatures',
		fieldSuggestions: {
			placeholder: 'Any additional unique elements or ideas?',
			suggestions: 'Go wild with your creative vision'
		}
	}
];

// Default configuration data - now DRY with shared field definitions
const defaultConfig: AppConfig = {
	masterSystemPrompt: SCENE_SETTING,
	
	eventInfo: {
		name: 'Zyeta x CORENET 2025',
		status: 'active' as const
	},

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
		millennial: {
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
		{ id: '6', displayName: 'Table 6', personaId: 'baby-boomer' },
		{ id: '7', displayName: 'Table 7', personaId: 'gen-x' },
		{ id: '8', displayName: 'Table 8', personaId: 'millennial' },
		{ id: '9', displayName: 'Table 9', personaId: 'gen-z' },
		{ id: '10', displayName: 'Table 10', personaId: 'gen-alpha' }
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

export function updateEventInfo(name?: string, status?: 'active' | 'inactive' | 'upcoming') {
	if (name !== undefined) {
		globalConfig.eventInfo.name = name;
	}
	if (status !== undefined) {
		globalConfig.eventInfo.status = status;
	}
}

/**
 * Centralized utility for building AI prompts for workspace generation
 * Handles different prompt formats for display and generation
 */
export class PromptBuilder {
	/**
	 * Builds a formatted prompt for display/preview purposes
	 * Includes system prompts and user-friendly formatting
	 */
	static buildForDisplay(
		persona: Persona,
		formData: PromptFields,
		includeSystemPrompt = true
	): string {
		if (!persona) return '';

		const promptParts: string[] = [];

		// 1. Scene Setting
		if (includeSystemPrompt) {
			promptParts.push(SCENE_SETTING);
		}

		// 2. Persona Context with requirements
		const personaParts: string[] = [];
		personaParts.push(`\n${persona.description}, who wants:\n`);

		// 3. Show all fields with appropriate formatting
		const fieldsList = this.formatFieldsForDisplay(persona.promptStructure, formData);
		personaParts.push(fieldsList.join('\n'));
		promptParts.push(personaParts.join(''));

		// 4. Rendering Specs (for display)
		if (includeSystemPrompt) {
			promptParts.push(`\n${RENDERING_SPECS}`);
		}

		return promptParts.join('\n');
	}

	/**
	 * Builds a structured prompt for AI generation
	 * Uses chain-of-thought approach with clear sections
	 */
	static buildForGeneration(persona: Persona, formData: PromptFields): string {
		if (!persona) return '';

		const promptParts: string[] = [];

		// 1. SCENE SETTING - What we're creating
		promptParts.push(SCENE_SETTING);

		// 2. USER VISION - Core concepts from persona and inputs
		promptParts.push(`\nDesigned specifically for: ${persona.description}`);

		// Collect user inputs as core design requirements
		const userVision = this.formatFieldsForGeneration(persona.promptStructure, formData);
		if (userVision.length > 0) {
			promptParts.push(`\nCore design requirements:\n${userVision.join('\n')}`);
		}

		// 3. RENDERING SPECS - How to visualize
		promptParts.push(`\n${RENDERING_SPECS}`);

		return promptParts.join('\n');
	}

	/**
	 * Formats form fields for display purposes with bullet points
	 */
	private static formatFieldsForDisplay(
		promptStructure: Persona['promptStructure'],
		formData: PromptFields
	): string[] {
		const fieldsList: string[] = [];

		for (const { field } of promptStructure) {
			const value = formData[field as keyof PromptFields];
			const displayValue = value && value.trim() ? value.trim() : '[Not provided yet]';

			switch (field) {
				case 'environment':
					fieldsList.push(`- An environment that is ${displayValue}`);
					break;
				case 'features':
					fieldsList.push(`- An office featuring ${displayValue}`);
					break;
				case 'colorPalette':
					fieldsList.push(`- A color palette of ${displayValue}`);
					break;
				case 'atmosphere':
					fieldsList.push(`- An atmosphere that is ${displayValue}`);
					break;
				case 'additionalFeatures':
					fieldsList.push(`- Additional elements: ${displayValue}`);
					break;
			}
		}

		return fieldsList;
	}

	/**
	 * Formats form fields for AI generation with structured labels
	 */
	private static formatFieldsForGeneration(
		promptStructure: Persona['promptStructure'],
		formData: PromptFields
	): string[] {
		const userVision: string[] = [];

		for (const { field } of promptStructure) {
			const value = formData[field as keyof PromptFields];

			if (value && value.trim()) {
				switch (field) {
					case 'environment':
						userVision.push(`Environment: ${value.trim()}`);
						break;
					case 'features':
						userVision.push(`Key features: ${value.trim()}`);
						break;
					case 'colorPalette':
						userVision.push(`Color palette: ${value.trim()}`);
						break;
					case 'atmosphere':
						userVision.push(`Atmosphere: ${value.trim()}`);
						break;
					case 'additionalFeatures':
						userVision.push(`Special elements: ${value.trim()}`);
						break;
				}
			}
		}

		return userVision;
	}

	/**
	 * Validates that all required fields are filled
	 */
	static validateFields(persona: Persona, formData: PromptFields): boolean {
		if (!persona) return false;

		for (const config of persona.promptStructure) {
			const value = formData[config.field as keyof PromptFields];
			if (!value || value.trim().length < 3) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Gets validation errors for form fields
	 */
	static getValidationErrors(persona: Persona, formData: PromptFields): Partial<PromptFields> {
		const errors: Partial<PromptFields> = {};

		if (!persona) return errors;

		for (const config of persona.promptStructure) {
			const value = formData[config.field as keyof PromptFields];
			if (!value || value.trim().length < 3) {
				errors[config.field as keyof PromptFields] =
					'Please provide a brief description (at least 3 characters).';
			}
		}

		return errors;
	}

	/**
	 * Calculates form completion progress
	 */
	static getFormProgress(persona: Persona, formData: PromptFields): number {
		if (!persona) return 0;

		// Only count the fields that are actually shown in the form
		const activeFields = persona.promptStructure.map((config) => config.field);
		const filledFields = activeFields.filter((field: string) => {
			const value = formData[field as keyof PromptFields];
			// Match the validation requirement: at least 3 characters and not empty
			return value && value.trim().length >= 3;
		}).length;

		return Math.round((filledFields / activeFields.length) * 100);
	}
}
