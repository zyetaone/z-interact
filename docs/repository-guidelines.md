# Repository Guidelines

## Project Structure & Module Organization

- `src/routes/`: SvelteKit routes and endpoints (`+page.svelte`, `+page.server.ts`, `+server.ts`).
- `src/lib/`: Reusable components, stores, server utilities (DB, AI, storage).
- `static/`: Public assets served as-is.
- `drizzle/`: SQL migrations and generated artifacts.
- `.svelte-kit/` and `build/`: Generated output (do not edit).

## Build, Test, and Development Commands

- `npm run dev`: Start local Vite dev server.
- `npm run dev:wrangler`: Run Cloudflare Pages adapter output with Wrangler.
- `npm run dev:local`: Build then run Pages locally with live reload.
- `npm run build`: Production build via Vite/SvelteKit.
- `npm run preview`: Preview the production build locally.
- `npm run check`: Type-check and Svelte diagnostics.
- `npm run lint` / `npm run format`: Lint or auto-format with Prettier/ESLint.
- `npm run db:generate|push|migrate|studio`: Drizzle schema workflows.

## Coding Style & Naming Conventions

- Use TypeScript and 2-space indentation; run `npm run format` before pushing.
- Components: PascalCase in `src/lib/components` (e.g., `QRModal.svelte`).
- Files follow SvelteKit conventions (`+page.svelte`, `+layout.svelte`, `+server.ts`).
- Prefer small, composable modules; colocate helpers under feature folders.
- Linting: ESLint + Prettier (see `.prettierrc`, `eslint.config.js`).

## Testing Guidelines

- No unit test runner is configured. Use:
  - `npm run check` for TS/Svelte type safety.
  - `npm run lint` and `npm run preview` for manual verification.
- If adding tests, prefer Vitest for unit tests (`*.test.ts`) and Playwright for e2e.

## Commit & Pull Request Guidelines

- Commits: concise, imperative subject (e.g., “Fix SSE streaming error”).
- Group related changes; avoid noisy formatting-only commits without need.
- PRs must include: purpose, scope, test/preview steps, screenshots for UI, and linked issues.
- Keep PRs small and focused; note any schema or env changes explicitly.

## Security & Configuration Tips

- Copy `.env.example` to `.env`; never commit secrets. Required keys: `OPENAI_API_KEY`, `DATABASE_URL`, optional Cloudflare R2 vars.
- For production, prefer Cloudflare bindings from `wrangler.toml` over raw env reads.
- Validate inputs on server endpoints; follow existing Valibot/Drizzle patterns in `src/lib/server`.
