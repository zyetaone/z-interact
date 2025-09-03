export type Persona = {
	id: string;
	title: string;
	description: string;
	promptPreamble: string;
	promptStructure: { label: string; field: keyof PromptFields }[];
	promptPostamble: string;
};

export type PromptFields = {
	identity: string;
	values: string;
	aspirations: string;
	aesthetic: string;
	features: string;
	vibe: string;
};

export type LockedImage = {
	personaId: string;
	personaTitle: string;
	imageUrl: string;
	prompt: string;
	lockedAt: string;
};

export const personas: Persona[] = [
	{
		id: 'baby-boomer',
		title: 'The Baby Boomer',
		description: '66 year old executive, CEO, board member kind in London',
		promptPreamble: 'Persona: Baby Boomer, 66, CEO/Board Member, London',
		promptStructure: [
			{ label: 'A workspace designed for...', field: 'identity' },
			{ label: 'Their values are...', field: 'values' },
			{ label: 'Their aspirations are...', field: 'aspirations' },
			{ label: 'The environment looks like...', field: 'aesthetic' },
			{ label: 'It features...', field: 'features' },
			{ label: 'Designed to feel...', field: 'vibe' }
		],
		promptPostamble:
			'High-quality photorealistic render, premium finishes, cinematic lighting, ultra-detailed textures, wide-angle interior perspective.\n--ar 16:9 --v 6.0 --stylize 750'
	},
	{
		id: 'gen-x',
		title: 'The Gen X Entrepreneur',
		description: '54 year old serial entrepreneur, jaded from the city life',
		promptPreamble: 'Persona: Generation X, 54, Serial Entrepreneur, Jaded from the city life',
		promptStructure: [
			{ label: 'A workspace designed for...', field: 'identity' },
			{ label: 'Their values are...', field: 'values' },
			{ label: 'Their aspirations are...', field: 'aspirations' },
			{ label: 'The environment looks like...', field: 'aesthetic' },
			{ label: 'It features...', field: 'features' },
			{ label: 'Designed to feel...', field: 'vibe' }
		],
		promptPostamble:
			'High-quality photorealistic render, premium finishes, cinematic lighting, ultra-detailed textures, wide-angle interior perspective.\n--ar 16:9 --v 6.0 --stylize 750'
	},
	{
		id: 'millennial',
		title: 'The Millennial Founder',
		description: '38 year old startup founder in India',
		promptPreamble: 'Persona: Millennial, 38, Startup Founder, India',
		promptStructure: [
			{ label: 'A workspace designed for...', field: 'identity' },
			{ label: 'Their values are...', field: 'values' },
			{ label: 'Their aspirations are...', field: 'aspirations' },
			{ label: 'The environment looks like...', field: 'aesthetic' },
			{ label: 'It features...', field: 'features' },
			{ label: 'Designed to feel...', field: 'vibe' }
		],
		promptPostamble:
			'High-quality photorealistic render, premium finishes, cinematic lighting, ultra-detailed textures, wide-angle interior perspective.\n--ar 16:9 --v 6.0 --stylize 750'
	},
	{
		id: 'gen-z',
		title: 'The Gen Z R&D Head',
		description: '31 year old Head of R&D in San Francisco',
		promptPreamble: 'Persona: Gen Z, 31, Head of R&D, San Francisco',
		promptStructure: [
			{ label: 'A workspace designed for...', field: 'identity' },
			{ label: 'Their values are...', field: 'values' },
			{ label: 'Their aspirations are...', field: 'aspirations' },
			{ label: 'The environment looks like...', field: 'aesthetic' },
			{ label: 'It features...', field: 'features' },
			{ label: 'Designed to feel...', field: 'vibe' }
		],
		promptPostamble:
			'High-quality photorealistic render, premium finishes, cinematic lighting, ultra-detailed textures, wide-angle interior perspective.\n--ar 16:9 --v 6.0 --stylize 750'
	}
];