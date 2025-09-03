
export interface PromptFields {
	identity: string;
	values: string;
	aspirations: string;
	aesthetic: string;
	features: string;
	vibe: string;
}

export interface Persona {
	id: string;
	title: string;
	description: string;
	promptPreamble: string;
	promptStructure: { label: string; field: keyof PromptFields }[];
	promptPostamble: string;
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
	personaTitle: string;
	imageUrl: string;
	prompt: string;
	lockedAt: string;
}


export const config: AppConfig = {
	masterSystemPrompt:
		'You are an expert interior designer creating inspirational concepts for office workspaces. Generate a photorealistic image based on the following detailed description. The image should be a wide-angle interior perspective, with cinematic lighting and ultra-detailed textures.',

	personas: {
		'baby-boomer': {
			id: 'baby-boomer',
			title: 'The Baby Boomer',
			description: '66 year old executive, CEO, board member kind in London',
			promptPreamble: 'Persona: Baby Boomer, 66, CEO/Board Member, London.',
			promptStructure: [
				{ label: 'A workspace designed for...', field: 'identity' },
				{ label: 'Their values are...', field: 'values' },
				{ label: 'Their aspirations are...', field: 'aspirations' },
				{ label: 'The environment looks like...', field: 'aesthetic' },
				{ label: 'It features...', field: 'features' },
				{ label: 'Designed to feel...', field: 'vibe' }
			],
			promptPostamble: '--ar 16:9 --v 6.0 --stylize 750'
		},
		'gen-x': {
			id: 'gen-x',
			title: 'The Gen X Entrepreneur',
			description: '54 year old serial entrepreneur, jaded from the city life',
			promptPreamble: 'Persona: Generation X, 54, Serial Entrepreneur, Jaded from the city life.',
			promptStructure: [
				{ label: 'A workspace designed for...', field: 'identity' },
				{ label: 'Their values are...', field: 'values' },
				{ label: 'Their aspirations are...', field: 'aspirations' },
				{ label: 'The environment looks like...', field: 'aesthetic' },
				{ label: 'It features...', field: 'features' },
				{ label: 'Designed to feel...', field: 'vibe' }
			],
			promptPostamble: '--ar 16:9 --v 6.0 --stylize 750'
		},
		millennial: {
			id: 'millennial',
			title: 'The Millennial Founder',
			description: '38 year old startup founder in India',
			promptPreamble: 'Persona: Millennial, 38, Startup Founder, India.',
			promptStructure: [
				{ label: 'A workspace designed for...', field: 'identity' },
				{ label: 'Their values are...', field: 'values' },
				{ label: 'Their aspirations are...', field: 'aspirations' },
				{ label: 'The environment looks like...', field: 'aesthetic' },
				{ label: 'It features...', field: 'features' },
				{ label: 'Designed to feel...', field: 'vibe' }
			],
			promptPostamble: '--ar 16:9 --v 6.0 --stylize 750'
		},
		'gen-alpha': {
			id: 'gen-alpha',
			title: 'The Gen Alpha Intern',
			description: '19 year old intern, digital native, content creator.',
			promptPreamble: 'Persona: Gen Alpha, 19, Intern, Digital Native, Content Creator.',
			promptStructure: [
				{ label: 'A workspace designed for...', field: 'identity' },
				{ label: 'Their values are...', field: 'values' },
				{ label: 'Their aspirations are...', field: 'aspirations' },
				{ label: 'The environment looks like...', field: 'aesthetic' },
				{ label: 'It features...', field: 'features' },
				{ label: 'Designed to feel...', field: 'vibe' }
			],
			promptPostamble: '--ar 16:9 --v 6.0 --stylize 750'
		}
	},

	tables: [
		{ id: '1', displayName: 'Table 1', personaId: 'baby-boomer' },
		{ id: '2', displayName: 'Table 2', personaId: 'gen-x' },
		{ id: '3', displayName: 'Table 3', personaId: 'millennial' },
		{ id: '4', displayName: 'Table 4', personaId: 'millennial' },
		{ id: '5', displayName: 'Table 5', personaId: 'gen-alpha' },
		{ id: '6', displayName: 'Table 6', personaId: 'gen-alpha' },
		{ id: '7', displayName: 'Table 7', personaId: 'millennial' },
		{ id: '8', displayName: 'Table 8', personaId: 'millennial' },
		{ id: '9', displayName: 'Table 9', personaId: 'gen-x' },
		{ id: '10', displayName: 'Table 10', personaId: 'baby-boomer' }
	]
};
