# AI Persona Workspace Activity - z-interact

A collaborative group-based activity for workspace design using AI image generation and personas.

## 🎯 Overview

Transform your z-interact app into a powerful group collaboration tool where teams design AI-generated workspaces based on generational personas.

## ✨ Features

### Presenter Dashboard (/)
- **QR Code Generation**: Unique QR codes for each persona table
- **Live Gallery**: Real-time display of locked-in workspace images
- **4 Personas**: Baby Boomer, Gen X, Millennial, Gen Z
- **Auto-refresh**: Updates every 3 seconds

### Collaborative Tables (/table/[personaId])
- **6-Field Collaboration**: Teams fill out identity, values, aspirations, aesthetic, features, vibe
- **AI Image Generation**: Creates workspace images from collaborative prompts
- **Regeneration**: Teams can iterate until satisfied
- **Lock-in Mechanism**: Final submission to presenter screen
- **Success State**: Confirmation screen after submission

## 🚀 Quick Start

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Open presenter dashboard**:
   Visit http://localhost:5174/

3. **Join a table**:
   - Scan QR code for your persona
   - Or visit http://localhost:5174/table/[persona-id]
   - Available personas: `baby-boomer`, `gen-x`, `millennial`, `gen-z`

## 🔧 Technical Implementation

### Architecture
- **Frontend**: SvelteKit 5 with Svelte 5 runes
- **State Management**: Reactive stores with API integration
- **Image Generation**: Placeholder API (ready for AI service integration)
- **Real-time Updates**: 3-second polling (upgradeable to SSE)
- **Persistence**: API endpoints with in-memory storage

### Key Files
```
src/
├── lib/
│   ├── personas.ts              # Persona definitions
│   └── stores/workspace.svelte.ts  # Reactive state management
├── routes/
│   ├── +page.svelte            # Presenter dashboard
│   ├── table/[personaId]/      # Collaborative workspace generator
│   └── api/
│       ├── generate-image/     # AI image generation endpoint
│       └── images/             # Image storage/retrieval
```

### Data Flow
1. **Teams collaborate** on prompt fields
2. **AI generates** workspace image from combined prompt
3. **Teams can regenerate** until satisfied
4. **Lock-in mechanism** saves to persistent storage
5. **Presenter dashboard** displays all locked images in real-time

## 🎨 Personas

### 1. The Baby Boomer (66, CEO/Board Member, London)
- Traditional executive workspace preferences
- Focus on formality and established business practices

### 2. The Gen X Entrepreneur (54, Serial Entrepreneur)
- Balanced approach between traditional and modern
- Efficiency and no-nonsense design focus

### 3. The Millennial Founder (38, Startup Founder, India)
- Collaborative and purpose-driven workspace design
- Technology integration with social connection

### 4. The Gen Z R&D Head (31, Head of R&D, San Francisco)
- Cutting-edge technology integration
- Flexibility and authentic work environments

## 🔗 AI Integration

The app is ready for AI service integration. Replace the placeholder in `/api/generate-image/+server.ts`:

```typescript
// Current: Placeholder
const imageUrl = `https://picsum.photos/1280/720?random=${Date.now()}`;

// Replace with: OpenAI DALL-E, Midjourney, etc.
const imageUrl = await generateAIImage(prompt);
```

## 🌟 Next Steps

### Production Readiness
- [ ] Integrate actual AI image generation service
- [ ] Replace in-memory storage with database/Cloudflare KV
- [ ] Add Server-Sent Events for real-time updates
- [ ] Add error handling and loading states
- [ ] Implement toast notifications

### Enhanced Features
- [ ] Add workspace template gallery
- [ ] Enable image editing/annotation
- [ ] Add team member management
- [ ] Export generated workspaces
- [ ] Analytics and insights dashboard

## 🎪 Demo Script

### For Facilitators (5 minutes setup)
1. Open presenter dashboard
2. Display QR codes on screen
3. Explain personas and activity goal

### For Participants (15 minutes activity)
1. Scan QR code for your table's persona
2. Collaborate on 6 workspace description fields
3. Generate AI workspace image
4. Iterate and regenerate as needed
5. Lock in final design

### For Debrief (10 minutes)
1. Presenter shows all locked designs
2. Compare generational differences
3. Discuss insights and preferences
4. Plan next steps for workspace design

---

**Ready to transform your workspace design process with AI and collaboration!** 🚀