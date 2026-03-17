# Repository Guidelines

## Project Structure & Modules

- `src/routes/` – SvelteKit routes (`+page.svelte`, `+page.server.ts`, APIs).
- `src/lib/` – shared code: `components/`, `stores/`, `utils/`, `server/` (DB, auth, env, AI, SSE).
- `drizzle/` – generated SQL and migration artifacts (do not edit by hand).
- `static/` – public assets served as-is.
- `docs/` – additional guides (deploy, architecture, repo guidelines).
- Do not modify `.svelte-kit/` or `build/` (generated).

## Build, Test, and Development

- `npm run dev` – start Vite dev server.
- `npm run build` – production build (Cloudflare adapter).
- `npm run preview` – preview production build locally.
- `npm run check` – Svelte type/semantic checks.
- `npm run lint` / `npm run format` – ESLint + Prettier check/format.
- Database (Drizzle): `npm run db:generate`, `npm run db:push`, `npm run db:migrate`, `npm run db:studio`.
- Cloudflare Pages dev: `npm run dev:wrangler` (from `.svelte-kit/cloudflare`).

## Coding Style & Naming

- Language: TypeScript + Svelte 5; Tailwind CSS.
- Formatting: Prettier; Linting: ESLint with `eslint-plugin-svelte` (2-space indent).
- Components use `PascalCase.svelte`; files in `src/lib/*` use `camelCase.ts`; route folders `kebab-case/`.
- Use `$lib` alias for internal imports (e.g., `import { env } from '$lib/server/env'`).
- Keep server-only code in `src/lib/server/`; do not import it from client modules.

## Testing Guidelines

- This repo does not include a unit test runner yet.
- Use `npm run check` and `npm run lint` in PRs.
- If adding tests, colocate as `*.spec.ts` next to modules and use Vitest; document setup in `docs/` before merging.

## Commit & Pull Requests

- Commits: short, imperative subject, e.g., `Fix image generation scope`, `Add admin event management`.
- Scope your changes; separate refactors from feature/bugfix commits.
- PRs must include: goal/summary, key changes, screenshots for UI, steps to verify, and any DB migration notes (`drizzle` artifacts).
- Link related issues; note env or Cloudflare config changes explicitly.

## Security & Config

- Copy `.env.example` to `.env`; never commit secrets.
- DB: `DATABASE_URL` defaults to `file:./local.db` (do not commit `local.db`).
- Cloudflare D1/Pages: requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (see `drizzle-d1.config.ts`, `wrangler.toml`).
- Keep long‑running or sensitive logic on the server; validate inputs in `src/lib/validation/` and server endpoints.
