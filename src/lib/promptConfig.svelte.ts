export interface PromptFields {
	environment: string;
	features: string;
	colorPalette: string;
	mood: string;
	designedToFeel: string;
	additionalFeatures: string;
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

// Master system prompt - kept in code, not user-configurable
export const MASTER_SYSTEM_PROMPT = `Photorealistic render of a 2030 open workspace that seamlessly incorporates the defined environment, office features, color palette, mood, designed feeling, and additional ideas.

The space must always be shown as a single-height open floorplate positioned directly beside expansive glazing, with the cityscape of the persona's location visible outside.

The view should capture the workspace in its entirety—showing people flow areas, workstations, collaboration zones, and integrated biophilic or digital elements—rather than isolated objects or random fragments.

The atmosphere should be daylight-rich, cinematic, ultra-detailed in textures, and presented with a wide-angle immersive perspective.`;

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
		label: 'The mood is',
		field: 'mood',
		fieldSuggestions: {
			placeholder: 'What atmosphere should the space create?',
			suggestions: 'sci-fi, calm, visionary, inspiring, energizing, experiential'
		}
	},
	{
		label: 'Designed to feel',
		field: 'designedToFeel',
		fieldSuggestions: {
			placeholder: 'How should people feel in this space?',
			suggestions: 'humane, refined, and future-proof'
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
