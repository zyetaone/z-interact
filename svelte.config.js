import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		adapter: adapter({
			// Point to our wrangler.toml for D1 bindings and other config
			config: 'wrangler.toml',
			// Configure routing for Pages Functions
			routes: {
				include: ['/*'],
				exclude: [
					'<prerendered>', // Exclude prerendered pages from Functions
					'/favicon.svg',
					'/robots.txt',
					'/images/*'
				]
			}
			// Removed SPA fallback to allow proper API route handling
		})
	},
	extensions: ['.svelte', '.svx']
};

export default config;
