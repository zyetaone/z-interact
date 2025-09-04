import { defineConfig } from 'drizzle-kit';
import { env } from './src/lib/server/env';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: {
		url: env.DATABASE_URL
	},
	verbose: true,
	strict: true,
	out: './drizzle'
});
