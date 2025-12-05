# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `npm run dev` - Start Vite dev server at http://localhost:5173
- `npm run build` - Build for Cloudflare Pages
- `npm run preview` - Preview production build locally
- `npm run check` - Run Svelte type checking
- `npm run check:watch` - Run type checking in watch mode

### Cloudflare Workers Development

- `npm run dev:wrangler` - Run with Wrangler (after build, for D1/R2 access)
- `npm run dev:local` - Build and run with Wrangler + live-reload

### Code Quality

- `npm run lint` - Run ESLint and Prettier checks
- `npm run format` - Format code with Prettier

### Database Operations

- `npm run db:generate` - Generate Drizzle migrations from schema changes
- `npm run db:push` - Push schema directly to D1 (dev workflow)
- `npm run db:migrate` - Apply migrations to database
- `npm run db:studio` - Open Drizzle Studio GUI

## Application Architecture

### Tech Stack

- **Framework**: SvelteKit 2 with Svelte 5 (using runes)
- **Database**: D1 (Cloudflare Workers) with Drizzle ORM
- **Styling**: Tailwind CSS 4 with custom UI components
- **State Management**: Central store with SvelteMap for reactive collections
- **AI Integration**: FAL.ai and OpenAI DALL-E 3 for image generation
- **Storage**: Cloudflare R2 object storage with CDN
- **Deployment**: Cloudflare Workers (stateless edge computing)

### Core Application Flow

This is an AI-powered workspace design platform for interactive seminars:

1. **Presenter Dashboard** (`/`) - Shows QR codes for 10 tables and live gallery view
2. **Participant Forms** (`/table/[tableId]`) - Table-specific forms for workspace design input
3. **Smart Gallery** - Central store-based gallery with automatic completion detection
4. **Image Management** - Multi-source display (fal.ai preview → R2/DB final) with automatic switching

### Key Architectural Patterns

#### Database Schema (`src/lib/server/db/schema.ts`)

- **users** - Authentication and role management
- **sessions** - Presentation sessions with codes
- **participants** - Session attendees with persona assignments
- **images** - Generated workspace images with multi-source URLs
- **activityLogs** - Analytics and activity tracking
- Uses proper foreign key relations and TypeScript inference

#### State Management Architecture

- **Central Image Store** (`src/lib/stores/image-store.svelte.ts`) - Single source of truth using SvelteMap for O(1) lookups
- **Smart Polling** (`src/lib/realtime/smart-feed.svelte.ts`) - Exponential backoff with automatic stop when all tables filled
- **Binary Utilities** (`src/lib/utils/binary.ts`) - Centralized base64/blob conversion with caching

#### AI Image Generation (`src/lib/server/ai/`)

- Modular image generation with provider abstraction
- Supports FAL.ai (primary) and OpenAI DALL-E 3 (fallback)
- Images stored in Cloudflare R2 object storage for optimal performance

#### State Management Patterns

- **Svelte 5 Runes**: `$state`, `$derived`, `$effect` for reactivity
- **SvelteMap/SvelteSet**: From `svelte/reactivity` for reactive collections
- **Differential Updates**: `syncWorkspaces()` fetches only changes since last timestamp

#### Remote Functions Pattern (SvelteKit)

Server-side functions using `query` and `command` from `$app/server`:

```typescript
// query - for reads, supports streaming generators
export const listImages = query(Schema, async (data) => { ... });

// command - for mutations
export const lockImage = command(Schema, async (data) => { ... });

// Streaming with async generators for progress
export const startGenerationStream = query(Schema, async function* (data) {
  yield { type: 'progress', data: { progress: 50 } };
  yield { type: 'result', data: { imageUrl: '...' } };
});
```

#### Validation Pattern (Valibot)

Shared validation pipes in `src/lib/validation/common.ts`:

```typescript
import { personaIdPipe, promptPipe, urlPipe } from '$lib/validation/common';

export const MySchema = v.object({
  personaId: personaIdPipe,
  prompt: promptPipe,
  imageUrl: urlPipe
});
```

### Project Structure

```
src/
├── lib/
│   ├── server/
│   │   ├── db/
│   │   │   ├── schema.ts         # Drizzle schema + Valibot validation
│   │   │   ├── queries.ts        # Centralized database queries
│   │   │   └── utils.ts          # getDatabase() helper
│   │   ├── ai/image-generator.ts # FAL.ai provider with factory pattern
│   │   └── env.ts                # Platform environment access
│   ├── stores/
│   │   ├── workspace-store.svelte.ts # Central SSOT with SvelteMap
│   │   ├── config-store.svelte.ts    # Personas, tables, PromptBuilder
│   │   └── toast.svelte.ts           # Toast notifications
│   ├── validation/
│   │   ├── schemas.ts            # Valibot schemas for remote functions
│   │   └── common.ts             # Shared validation pipes
│   ├── types/
│   │   └── index.ts              # Centralized TypeScript types
│   ├── utils/
│   │   ├── image-utils.ts        # Image URL validation
│   │   └── logger.ts             # Structured logging
│   └── components/
│       └── ui/                   # Flowbite-based UI components
├── routes/
│   ├── gallery/
│   │   ├── +page.svelte          # Gallery view
│   │   └── gallery.remote.ts     # Image CRUD remote functions
│   ├── table/
│   │   ├── [tableId]/+page.svelte # Participant workspace form
│   │   └── ai.remote.ts          # generateImage, editImage, lockImage
│   ├── storage/
│   │   └── r2.remote.ts          # R2 upload/delete operations
│   └── +page.svelte              # QR codes dashboard
└── app.css                       # Tailwind CSS 4 styles
```

### Environment Variables

Local dev uses `.env`, production uses Cloudflare dashboard secrets:

```
FAL_API_KEY=your-key-here        # Set as secret in Cloudflare
R2_PUBLIC_URL=https://...r2.dev  # Public R2 bucket URL
```

Bindings in `wrangler.toml`:
- `z_interact_db` - D1 database
- `R2_IMAGES` - R2 bucket for image storage

### Important Implementation Notes

#### Cloudflare Platform Access

Get D1/R2 bindings via platform:

```typescript
import { getRequestEvent } from '$app/server';

const event = getRequestEvent();
const platform = event?.platform;
const db = platform?.env?.z_interact_db;
const r2 = platform?.env?.R2_IMAGES;
```

#### Database Connection

- Uses Drizzle ORM with D1 (Cloudflare Workers)
- `getDatabase()` in `src/lib/server/db/utils.ts` handles platform access
- Schema changes: `npm run db:generate` then `npm run db:push`

#### Image Generation Flow

1. **Generate**: `generateImage()` calls FAL.ai, returns temporary URL
2. **Preview**: User sees fal.ai URL (temporary, expires)
3. **Lock**: `lockImage()` uploads to R2, saves to D1 with permanent URL
4. **Gallery**: `syncWorkspaces()` fetches locked images for display

#### Workspace Store Pattern

Central state in `workspace-store.svelte.ts`:

```typescript
const workspaces = $state(new SvelteMap<string, WorkspaceData>());

// Sync with database
await syncWorkspaces({ tableId, reset: true });

// Update local state
setWorkspaceGallery(tableId, imageUrl, prompt);
lockWorkspace(tableId);
```

#### Table/Persona Mapping

10 tables mapped to 5 personas (2 tables each):
- Tables 1-2: baby-boomer
- Tables 3-4: gen-x
- Tables 5-6: millennial
- Tables 7-8: gen-z
- Tables 9-10: gen-alpha

### Architecture Decisions

#### Why Polling Instead of SSE/WebSockets?

- Cloudflare Workers are stateless (no persistent connections)
- `syncWorkspaces()` with timestamp tracking achieves similar UX
- System stops polling when all tables have locked images

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
