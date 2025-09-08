# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `npm run dev` - Start development server at http://localhost:5173
- `npm run build` - Build production application
- `npm run preview` - Preview production build locally
- `npm run check` - Run Svelte type checking
- `npm run check:watch` - Run type checking in watch mode

### Code Quality

- `npm run lint` - Run ESLint and Prettier checks
- `npm run format` - Format code with Prettier

### Database Operations

- `npm run db:generate` - Generate Drizzle migrations from schema
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Apply migrations to database
- `npm run db:studio` - Open Drizzle Studio database GUI

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
- **Remote Functions**: Using `.updates()` for automatic query refresh
- **Differential Updates**: Only fetch changes since last sync timestamp

### Project Structure

```
src/
├── lib/
│   ├── server/
│   │   ├── db/
│   │   │   ├── schema.ts         # Database schema with TypeScript types
│   │   │   └── queries.ts        # Centralized database queries
│   │   ├── ai/image-generator.ts # AI image generation with provider abstraction
│   │   ├── r2-storage.ts         # Cloudflare R2 object storage
│   │   └── event-bus.ts          # Event broadcasting (limited use with Workers)
│   ├── stores/
│   │   ├── image-store.svelte.ts # Central SSOT with SvelteMap
│   │   └── toast.svelte.ts       # Toast notifications
│   ├── realtime/
│   │   └── smart-feed.svelte.ts  # Smart polling with backoff
│   ├── utils/
│   │   ├── binary.ts             # Base64/blob conversions
│   │   └── image-utils.ts        # Image utilities
│   └── components/
│       └── ui/                   # Reusable UI components
├── routes/
│   ├── gallery/
│   │   ├── +page.svelte          # Gallery view using central store
│   │   └── gallery.remote.ts     # Remote functions with differential queries
│   ├── table/
│   │   ├── [tableId]/+page.svelte # Table-specific participant forms
│   │   └── ai.remote.ts          # AI generation remote functions
│   └── +page.svelte              # Presenter dashboard
└── app.css                       # Global styles with CSS variables
```

### Environment Variables

```
DATABASE_URL=file:./local.db
FAL_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
SESSION_SECRET=your-secret-here
R2_PUBLIC_URL=your-r2-url
```

### Important Implementation Notes

#### Modern Svelte 5 Patterns

- **SvelteMap for Reactive Collections**:

```typescript
const imagesById = new SvelteMap<string, ImageEntity>();
const tableState = new SvelteMap<string, TableInfo>();
```

- **Remote Functions with Updates**:

```typescript
await saveImage({...}).updates(
  listImages({}).withOverride((images) =>
    // Optimistic update logic
  )
);
```

- **Smart Polling with createSubscriber**:

```typescript
const subscribe = createSubscriber((update) => {
	// Polling logic with cleanup
	return () => {
		/* cleanup */
	};
});
```

- **Await Expressions in Components**:

```svelte
{#await listImages({})}
	<!-- Loading -->
{:then images}
	<!-- Display images -->
{:catch error}
	<!-- Error handling -->
{/await}
```

#### Database Connection

- Uses Drizzle ORM with D1 (Cloudflare Workers)
- Connection configured in `drizzle.config.ts`
- Schema changes require `npm run db:generate` then `npm run db:push`
- Differential queries support with timestamp tracking

#### Image Storage & Display Strategy

- **Multi-source Priority**: R2 > DB > fal.ai > blob > base64
- **Cloudflare R2**: Primary storage with global CDN distribution
- **Source Switching**: Automatic transition from preview to final
- **Binary Caching**: Blob URLs cached to avoid recreation
- **Central Store**: Single source of truth for all image state

#### Table Completion Tracking

- **10 Tables Total**: Each mapped to a persona (baby-boomer, gen-x, millennial, gen-z, gen-alpha)
- **Completion Detection**: Table marked 'ready' when image is locked
- **Auto-stop Polling**: System stops polling when all tables ready
- **Visual Indicators**: Lock icons and status bars show completion state

#### Component Styling

- Bits UI components wrapped with custom styling in `src/lib/components/ui/`
- Tailwind CSS classes with theme customization
- Toast notifications for user feedback
- Error boundaries with `<svelte:boundary>`

#### Smart Update System (Cloudflare Workers Compatible)

- **Differential Polling**: `listImagesSince()` fetches only changes since last sync
- **Exponential Backoff**: Polling frequency decreases as tables fill (1.1x to 16x multiplier)
- **Automatic Stop**: Polling halts when all 10 tables have locked images
- **Remote Functions**: Use `.updates()` for query refresh with optimistic UI
- **Multi-source Display**: Automatic switching from fal.ai preview to R2/DB final image

### Testing Strategy

The application includes comprehensive error handling and user feedback but tests would need to be implemented. Key areas to test:

- Database operations with Drizzle
- Image generation and storage
- Smart polling with differential updates
- Form validation and submission
- Central store state management

### Security Considerations

- Password hashing with Argon2
- Input validation on all API endpoints
- Environment variable protection
- SQL injection prevention via Drizzle parameterized queries

### Architecture Decisions

#### Why Not SSE/WebSockets?

- Cloudflare Workers are stateless (no persistent connections)
- Smart polling with differential queries achieves similar UX
- Exponential backoff minimizes unnecessary requests
- System automatically stops when complete

#### Performance Optimizations

- SvelteMap for O(1) lookups vs array operations
- Differential queries reduce data transfer
- Binary caching prevents redundant conversions
- Smart backoff reduces server load as tables fill

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
