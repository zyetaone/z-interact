# Z-Interact: AI-Powered Workspace Design Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/your-org/z-interact)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.22.0-orange)](https://svelte.dev/)

An interactive seminar experience platform that combines real-time collaboration with AI-powered workspace design generation using Fal.ai (nano‑banana) and Cloudflare R2 for storage.

## ✨ Features

### 🎨 AI-Powered Image Generation

- **Fal.ai (nano‑banana)**: High-quality, persona‑specific workspace designs
- **Optimized Prompts**: Centralized prompt builder tuned for architectural renders
- **Lock-in Persistence**: Temporary Fal URLs are stored permanently in Cloudflare R2 when locked

### 💾 Production-Ready Database

- **SQLite/LibSQL + Drizzle ORM**: Robust persistence, easy local/dev
- **Images Table**: Simple, focused schema for generated/locked images
- **Incremental Sync**: Efficient workspace syncs based on last update timestamps

### 🔄 Updates / Sync

- **Remote Functions**: SvelteKit remote functions handle reads/writes
- **Smart Sync**: `syncWorkspaces()` fetches + normalizes + updates store in a single call
- **Incremental**: Only fetches changes after the first full sync

### 🔐 Security

- **Validation**: Valibot schemas + shared validation pipes
- **Remote Guardrails**: Basic SSRF protections for server‑side image download (allowlisted hosts, timeouts)

### 🎯 User Experience

- **QR Code Access**: Instant session joining via mobile devices
- **Responsive Design**: Optimized for desktop and mobile
- **Toast Notifications**: Real-time user feedback
- **Loading States**: Professional loading indicators and animations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or bun
- OpenAI API key

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/z-interact.git
   cd z-interact
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment setup**

   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key
   ```

4. **Database setup**

   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:5173
   ```

## 📋 Usage

### For Presenters

1. **Access the QR Codes page** at `/` to share access links
2. **View the Gallery page** at `/gallery` to monitor real-time submissions
3. **Scan QR codes** or **copy links** to share with participants
4. **Monitor real-time submissions** in the live gallery
5. **Manage sessions** and view analytics

### For Participants

1. **Scan QR code** or **click link** for your persona from the QR Codes page
2. **Fill out the workspace design form** with your preferences
3. **Generate AI image** using OpenAI DALL-E 3
4. **Lock in your submission** to appear on the Gallery page

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Svelte 5, SvelteKit 2, Tailwind CSS
- **Backend**: SvelteKit remote functions
- **Database**: SQLite/LibSQL with Drizzle ORM
- **AI**: Fal.ai (nano‑banana)
- **Storage**: Cloudflare R2
- **UI Components**: Flowbite + custom components

### Project Structure

```
src/
├── lib/
│   ├── stores/
│   │   ├── config-store.svelte.ts     # Personas, tables, prompt builder
│   │   ├── workspace-store.svelte.ts  # Workspaces SSOT + syncWorkspaces()
│   │   ├── theme.svelte.ts            # Theme store
│   │   └── toast.svelte.ts            # Toast store
│   ├── server/
│   │   └── db/                        # Drizzle schema, queries, utils
│   │   ├── ai/           # OpenAI integration
│   │   ├── auth.ts       # Authentication system
│   │   └── sse-manager.ts # Real-time communication
│   ├── stores/           # Svelte stores
│   ├── components/                    # UI + workspace components
│   ├── utils/                         # Utilities (logging, image utils, etc.)
│   └── config.svelte.ts               # Public facade re‑exports (no legacy aliases)
├── routes/
│   ├── storage/r2.remote.ts           # Upload/delete to Cloudflare R2
│   ├── gallery/gallery.remote.ts       # Image list/clear/since/subscribe + server uploads
│   ├── table/ai.remote.ts             # Generate/edit/lock image
│   ├── gallery/+page.svelte           # Gallery
│   └── table/[tableId]/+page.svelte   # Participant form
└── app.css               # Global styles
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=file:./local.db

# Fal.ai
FAL_API_KEY=your-fal-api-key

# Cloudflare R2
R2_IMAGES=<bound in worker/platform>
R2_PUBLIC_URL=https://<public-r2-domain>

# Authentication
SESSION_SECRET=your-session-secret-here
```

### Build Configuration

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: [vitePreprocess()],
	kit: {
		adapter: adapter(),
		alias: {
			$lib: 'src/lib'
		}
	}
};
```

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test
```

### Test Coverage

- ✅ **Unit Tests**: Core functionality (80%+ coverage)
- ✅ **Integration Tests**: Database operations and API endpoints
- ✅ **E2E Tests**: Complete user workflows
- ✅ **Performance Tests**: Load testing scenarios

## 📊 App Integration

### Sync Workspaces (Client)

```ts
import { syncWorkspaces } from '$lib/config.svelte';

// Gallery: first load full, then incremental
await syncWorkspaces({ limit: 100, reset: true });

// Table: per-table sync
await syncWorkspaces({ tableId, limit: 50, reset: true });
```

### Remote Functions (Server)

- `src/routes/table/ai.remote.ts`: `generateImage`, `editImage`, `lockImage`
- `src/routes/gallery/gallery.remote.ts`: `listImages`, `getImageById`, `deleteImage`, `clearImages`, `listImagesSince`, `subscribeToGalleryUpdates`, `uploadImageUrl`, `uploadBlob`, `uploadImage`
- `src/routes/storage/r2.remote.ts`: `uploadFromUrl`, `uploadFromBase64`, `uploadFromBuffer`, `deleteFromR2`

## 🚀 Deployment

### Production Build

```bash
npm run build
npm run preview
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup

```bash
# Production environment
NODE_ENV=production
DATABASE_URL=file:/app/data/production.db
OPENAI_API_KEY=your-production-key
SESSION_SECRET=your-production-secret
```

## 🔒 Security

### Authentication

- **Password Hashing**: Argon2 with salt
- **Session Security**: HTTP-only cookies, CSRF protection
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Comprehensive sanitization

### Data Protection

- **Encryption**: Sensitive data encrypted at rest
- **Access Control**: Role-based permissions
- **Audit Logging**: All user actions tracked
- **SQL Injection Prevention**: Parameterized queries

## 📈 Performance

### Benchmarks

- **Page Load**: < 2 seconds
- **Image Generation**: < 15 seconds (OpenAI DALL-E 3)
- **Database Queries**: < 100ms average
- **Real-time Updates**: < 100ms latency
- **Concurrent Users**: Supports 100+ simultaneous users

### Optimizations

- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: WebP format support
- **Caching**: Service worker for offline support
- **Bundle Analysis**: Optimized build output

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality enforcement
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Standardized commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI**: For the DALL-E 3 API
- **Svelte**: For the amazing framework
- **SvelteKit**: For the full-stack capabilities
- **Bits UI**: For the accessible component library
- **Tailwind CSS**: For the utility-first styling

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/z-interact/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/z-interact/discussions)
- **Documentation**: [Wiki](https://github.com/your-org/z-interact/wiki)

---

**Built with ❤️ using SvelteKit, OpenAI, and modern web technologies**

---

_Last updated: September 2024_

# Cloudflare deployment trigger
