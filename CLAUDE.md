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
- **Database**: SQLite with Drizzle ORM
- **Styling**: Tailwind CSS 4 with custom UI components
- **Real-time**: Server-Sent Events (SSE) via custom SSE manager
- **AI Integration**: OpenAI DALL-E 3 API for image generation
- **Authentication**: Argon2 password hashing with session management

### Core Application Flow

This is an AI-powered workspace design platform for interactive seminars:

1. **Presenter Dashboard** (`/`) - Shows QR codes for different generational personas and live gallery
2. **Participant Forms** (`/table/[personaId]`) - Persona-specific forms for workspace design input
3. **Real-time Gallery** - Live updates showing generated workspace images from all participants

### Key Architectural Patterns

#### Database Schema (`src/lib/server/db/schema.ts`)

- **users** - Authentication and role management
- **sessions** - Presentation sessions with codes
- **participants** - Session attendees with persona assignments
- **images** - Generated workspace images stored in Cloudflare R2
- **activityLogs** - Analytics and activity tracking
- Uses proper foreign key relations and TypeScript inference

#### Real-time Communication (`src/lib/server/sse-manager.ts`)

- Custom SSE manager class for broadcasting updates
- Automatic client cleanup for inactive connections
- Broadcasts image generation events to all connected clients

#### AI Image Generation (`src/lib/server/ai/`)

- Modular image generation with provider abstraction
- Supports OpenAI DALL-E 3 with fallback to placeholder images
- Images stored in Cloudflare R2 object storage for optimal performance

#### State Management

- Svelte 5 runes for reactive state
- Context-based sharing between components
- Real-time updates via SSE subscription

### Project Structure

```
src/
├── lib/
│   ├── server/
│   │   ├── db/schema.ts          # Database schema and types
│   │   ├── ai/image-generator.ts # AI image generation logic
│   │   ├── image-storage.ts      # Legacy base64 image storage (fallback only)
│   │   └── sse-manager.ts        # Real-time communication
│   ├── components/
│   │   ├── ui/                   # Reusable UI components (Button, Toast, etc.)
│   │   └── Navigation.svelte     # App navigation
│   └── stores/                   # Svelte state management
├── routes/
│   ├── api/                      # SvelteKit API endpoints
│   │   ├── generate-image/       # Image generation endpoint
│   │   ├── images/               # Image storage/retrieval
│   │   └── sse/                  # Server-sent events endpoint
│   ├── table/[personaId]/        # Participant form pages
│   └── +page.svelte              # Presenter dashboard
└── app.css                       # Global styles with CSS variables
```

### Environment Variables

```
DATABASE_URL=file:./local.db
OPENAI_API_KEY=your-key-here
SESSION_SECRET=your-secret-here
```

### Important Implementation Notes

#### Database Connection

- Uses Drizzle ORM with SQLite
- Connection configured in `drizzle.config.ts`
- Schema changes require `npm run db:generate` then `npm run db:push`

#### Image Storage Strategy

- Images generated via API are stored in Cloudflare R2 object storage
- Provides high-performance access with global CDN distribution
- Base64 fallback available for environments without R2 configuration
- See `src/lib/server/r2-storage/` for R2 implementation

#### Svelte 5 Patterns

- Uses modern runes syntax (`$state`, `$derived`, `$effect`)
- Components use `let { prop }: { prop: Type } = $props()` pattern
- Event handling with `onclick={handler}` instead of `on:click`

#### Component Styling

- Bits UI components wrapped with custom styling in `src/lib/components/ui/`
- Tailwind CSS classes with theme customization
- Toast notifications for user feedback

#### Real-time Updates

- SSE endpoint at `/api/sse` broadcasts updates
- Client-side EventSource connection for real-time gallery updates
- Automatic reconnection handling on connection loss

### Testing Strategy

The application includes comprehensive error handling and user feedback but tests would need to be implemented. Key areas to test:

- Database operations with Drizzle
- Image generation and storage
- Real-time SSE communication
- Form validation and submission

### Security Considerations

- Password hashing with Argon2
- Input validation on all API endpoints
- Environment variable protection
- SQL injection prevention via Drizzle parameterized queries
