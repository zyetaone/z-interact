export interface PromptFields {
	environment: string;
	features: string;
	colorPalette: string;
	atmosphere: string; // Combined mood + feeling
	additionalFeatures: string;
	// Legacy fields for backward compatibility
	mood?: string;
	designedToFeel?: string;
}

export interface FieldSuggestions {
	placeholder: string;
	suggestions: string;
}

export interface PromptFieldConfig {
	label: string;
	field: keyof PromptFields;
	fieldSuggestions: FieldSuggestions;
}

// Scene setting - establishes what we're creating
export const SCENE_SETTING = `Interior design visualization, hyperreal: A 2030 corporate workspace interior. Single open floor with floor-to-ceiling windows overlooking the cityscape.`;

// Rendering specifications - how to visualize (consolidated)
export const RENDERING_SPECS = `Render specifications: Photorealistic architectural photography style. Wide-angle perspective showing complete workspace. Depth of field <Important>Clean visual without any text, labels, logos, or watermarks. Focus on architectural details and spatial flow. Follow color palette specified</Important>`;

// Export old names for backward compatibility (will be removed later)
export const MASTER_SYSTEM_PROMPT = SCENE_SETTING;
export const TECHNICAL_REQUIREMENTS = RENDERING_SPECS;
export const IMAGE_QUALITY_REQUIREMENTS = '';

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
