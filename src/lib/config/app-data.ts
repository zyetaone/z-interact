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
		'Photorealistic architectural visualization of a complete modern workspace ecosystem.',

	eventInfo: {
		name: 'Zyeta x CORENET 2025',
		status: 'active' as const
	},

	personas: {
		'baby-boomer': {
			id: 'baby-boomer',
			title: 'CXO Executive',
			description:
				'68-year-old CXO level executive in London, United Kingdom. Baby Boomer seeking to leave a meaningful legacy. Values trust, loyalty, legacy, and long-term stability in their workspace design.',
			promptStructure: DEFAULT_PROMPT_FIELDS
		},
		'gen-x': {
			id: 'gen-x',
			title: 'Serial Entrepreneur',
			description:
				'55-year-old serial entrepreneur in Munich, Germany. Generation X leader jaded from city life, looking to offer meaning to their employees. Pragmatic, independent, adaptable, and strong steward of governance and knowledge.',
			promptStructure: DEFAULT_PROMPT_FIELDS
		},
		millennial: {
			id: 'millennial',
			title: 'Head of R&D',
			description:
				'38-year-old Head of R&D at a Semiconductor MNC in Sunnyvale, North America. Millennial trying to create an office for maximum productivity. Purpose-driven, tech-savvy, and seeking work-life balance.',
			promptStructure: DEFAULT_PROMPT_FIELDS
		},
		'gen-z': {
			id: 'gen-z',
			title: 'AI Startup Founder',
			description:
				'27-year-old AI Startup Founder in Bangalore, India. Gen Z entrepreneur designing an office to spark innovation. Hyper-connected, digitally fluent, socially aware, and entrepreneurial.',
			promptStructure: DEFAULT_PROMPT_FIELDS
		},
		'gen-alpha': {
			id: 'gen-alpha',
			title: 'Student Innovator',
			description:
				'20-year-old student innovator, intern, and tech enthusiast in Singapore. Gen Alpha looking forward to their first stint in a professional setting. Emerging, tech-immersed, globally minded, and climate-conscious.',
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
