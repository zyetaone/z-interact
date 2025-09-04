import { defineConfig } from 'drizzle-kit';
import { env } from './src/lib/server/env';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	driver: 'd1-http',
	dbCredentials: {
		databaseId: '42c899ea-ff0f-4c9e-adfd-bcd3a4ae4ffa',
		token: env.CLOUDFLARE_API_TOKEN!,
		accountId: env.CLOUDFLARE_ACCOUNT_ID!
	},
	verbose: true,
	strict: true
});
