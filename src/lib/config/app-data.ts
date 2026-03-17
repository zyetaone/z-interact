import type { AppConfig, PromptFieldConfig } from '$lib/types';

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
		label: 'Location Setting: Country / Urban Dense / Rural?',
		field: 'locationSetting',
		fieldSuggestions: {
			placeholder: 'Describe the setting — country, urban dense, rural, or a mix...',
			suggestions:
				'urban dense high-rise district, countryside retreat, suburban campus, coastal setting, mixed-use development'
		}
	},
	{
		label: 'Generational Cohorts within the office?',
		field: 'generationalCohorts',
		fieldSuggestions: {
			placeholder: 'What mix of generations will work in this office?',
			suggestions:
				'multi-generational blend, predominantly Gen Z and Millennial, Baby Boomer mentors with Gen Alpha interns, all ages equally represented'
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

// Default configuration data - personas, tables, and event info
export const defaultConfig: AppConfig = {
	masterSystemPrompt:
		'Design an office which is relevant in 2033. Photorealistic architectural visualization of a complete future-forward workspace ecosystem.',

	eventInfo: {
		name: 'Zyeta x CORENET 2026',
		status: 'active' as const
	},

	personas: {
		'baby-boomer': {
			id: 'baby-boomer',
			title: 'CXO Executive',
			description:
				'You are a 68-year-old executive, CXO level living in Beijing, China. Problem Statement: Seasoned individual wanting to leave a legacy. Generational Identity: Baby Boomer.',
			promptStructure: DEFAULT_PROMPT_FIELDS
		},
		'gen-x': {
			id: 'gen-x',
			title: 'Serial Entrepreneur',
			description:
				'You are a 55-year-old serial entrepreneur, based in Kuala Lumpur, Malaysia. Problem Statement: Jaded from city life, looking to offer meaning to their employees. Generational Identity: Generation X.',
			promptStructure: DEFAULT_PROMPT_FIELDS
		},
		millennial: {
			id: 'millennial',
			title: 'Head of R&D',
			description:
				'You are a 38-year-old Head of R&D, Semiconductor Multinational Company, Singapore. Problem Statement: Trying to create an office for maximum productivity. Generational Identity: Millennial.',
			promptStructure: DEFAULT_PROMPT_FIELDS
		},
		'gen-z': {
			id: 'gen-z',
			title: 'AI Startup Founder',
			description:
				'You are a 27-year-old AI Startup Founder, Bangalore, India. Problem Statement: An office to spark innovation. Generational Identity: Gen Z.',
			promptStructure: DEFAULT_PROMPT_FIELDS
		},
		'gen-alpha': {
			id: 'gen-alpha',
			title: 'Student Innovator',
			description:
				'You are a 20-year-old student innovator, tech enthusiast intern, Hong Kong. Problem Statement: Looking forward to their first stint in a professional setting. Generational Identity: Gen Alpha.',
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
