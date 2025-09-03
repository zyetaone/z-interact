# Z-Interact API Documentation

## Overview

Z-Interact provides a comprehensive REST API for managing AI-powered workspace design sessions, real-time collaboration, and image generation using OpenAI DALL-E 3.

## Base URL
```
http://localhost:5173/api
```

## Authentication

Currently, the API uses session-based authentication. Future versions will include JWT token authentication.

## Endpoints

### Image Generation

#### Generate AI Image
Generate a workspace design image using OpenAI DALL-E 3.

```http
POST /api/generate-image
Content-Type: application/json
```

**Request Body:**
```json
{
  "prompt": "A modern office workspace designed for a CEO in their 60s",
  "personaId": "baby-boomer",
  "size": "1024x1024",
  "quality": "standard"
}
```

**Parameters:**
- `prompt` (string, required): Description of the workspace to generate
- `personaId` (string, required): Identifier for the persona type
- `size` (string, optional): Image size - "256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"
- `quality` (string, optional): Image quality - "standard", "hd"
- `style` (string, optional): Image style - "vivid", "natural"

**Response (Success):**
```json
{
  "success": true,
  "imageUrl": "https://oaidalleapiprodscus.blob.core.windows.net/...",
  "provider": "openai",
  "prompt": "A modern office workspace designed for a CEO in their 60s",
  "metadata": {
    "model": "dall-e-3",
    "size": "1024x1024",
    "revisedPrompt": "Enhanced prompt from OpenAI"
  }
}
```

**Response (Error):**
```json
{
  "error": "Failed to generate image",
  "details": "OpenAI API key not configured"
}
```

**Error Codes:**
- `400`: Invalid request parameters
- `500`: Server error or API failure

### Image Management

#### Get All Images
Retrieve all stored workspace images.

```http
GET /api/images
```

**Response:**
```json
[
  {
    "id": "img-123",
    "personaId": "baby-boomer",
    "personaTitle": "The Baby Boomer",
    "imageUrl": "https://example.com/image.png",
    "prompt": "A modern office workspace...",
    "provider": "openai",
    "status": "completed",
    "createdAt": "2024-09-03T05:28:43.000Z",
    "updatedAt": "2024-09-03T05:28:43.000Z"
  }
]
```

#### Save Image
Store a generated image in the database.

```http
POST /api/images
Content-Type: application/json
```

**Request Body:**
```json
{
  "personaId": "baby-boomer",
  "personaTitle": "The Baby Boomer",
  "imageUrl": "https://example.com/image.png",
  "prompt": "A modern office workspace...",
  "provider": "openai",
  "status": "completed"
}
```

**Response:**
```json
{
  "success": true,
  "image": {
    "id": "img-123",
    "personaId": "baby-boomer",
    "personaTitle": "The Baby Boomer",
    "imageUrl": "https://example.com/image.png",
    "prompt": "A modern office workspace...",
    "provider": "openai",
    "status": "completed",
    "createdAt": "2024-09-03T05:28:43.000Z",
    "updatedAt": "2024-09-03T05:28:43.000Z"
  }
}
```

#### Clear All Images
Remove all stored images (for testing/demo purposes).

```http
DELETE /api/images
```

**Response:**
```json
{
  "success": true,
  "message": "All images cleared"
}
```

### Real-Time Updates

#### Server-Sent Events Stream
Establish a real-time connection for live updates.

```http
GET /api/sse
Accept: text/event-stream
```

**Event Types:**

**Connection Established:**
```json
{
  "type": "connected",
  "data": { "clientId": "abc-123" },
  "timestamp": 1725343723000
}
```

**Image Locked:**
```json
{
  "type": "image_locked",
  "data": {
    "id": "img-123",
    "personaId": "baby-boomer",
    "personaTitle": "The Baby Boomer",
    "imageUrl": "https://example.com/image.png",
    "prompt": "A modern office workspace...",
    "provider": "openai",
    "createdAt": "2024-09-03T05:28:43.000Z"
  },
  "timestamp": 1725343723000
}
```

### Debug Information

#### Get Debug Info
Retrieve environment and configuration information.

```http
GET /api/debug
```

**Response:**
```json
{
  "env": {
    "OPENAI_API_KEY": "***d3s3",
    "hasOpenAI": true,
    "openAILength": 164
  },
  "processEnv": {
    "OPENAI_API_KEY": "***d3s3",
    "hasOpenAI": true,
    "openAILength": 164
  }
}
```

## Data Models

### Image
```typescript
interface Image {
  id: string;
  personaId: string;
  personaTitle: string;
  imageUrl: string;
  prompt: string;
  provider: 'openai' | 'stability' | 'unsplash' | 'placeholder';
  status: 'generating' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  sessionId?: string;
  participantId?: string;
}
```

### Persona
```typescript
interface Persona {
  id: string;
  title: string;
  description: string;
  promptPreamble: string;
  promptStructure: PromptField[];
  promptPostamble: string;
}

interface PromptField {
  label: string;
  field: keyof PromptFields;
}

interface PromptFields {
  identity: string;
  values: string;
  aspirations: string;
  aesthetic: string;
  features: string;
  vibe: string;
}
```

## Error Handling

All API endpoints follow consistent error response formats:

```json
{
  "error": "Error message",
  "details": "Additional error information"
}
```

### Common Error Codes
- `400 Bad Request`: Invalid parameters or missing required fields
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

## Rate Limiting

- **Image Generation**: 10 requests per minute per IP
- **Image Retrieval**: 100 requests per minute per IP
- **Real-time Connections**: 50 concurrent SSE connections

## Authentication

### Session-Based Auth
```typescript
// Automatic session management via HTTP-only cookies
// No manual token handling required for basic usage
```

### Future JWT Implementation
```typescript
// Planned for future versions
interface AuthToken {
  userId: string;
  role: 'admin' | 'presenter' | 'participant';
  exp: number;
  iat: number;
}
```

## WebSocket Alternative

For applications requiring bidirectional communication, consider upgrading to WebSocket:

```javascript
// Client-side WebSocket connection
const ws = new WebSocket('ws://localhost:5173/api/ws');

// Listen for messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Send messages
ws.send(JSON.stringify({
  type: 'join_session',
  sessionId: 'session-123'
}));
```

## SDK Examples

### JavaScript/Node.js
```javascript
// Image generation
const response = await fetch('/api/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Modern office workspace',
    personaId: 'baby-boomer'
  })
});

const result = await response.json();
console.log('Generated image:', result.imageUrl);
```

### Python
```python
import requests

# Generate image
response = requests.post('http://localhost:5173/api/generate-image', json={
    'prompt': 'Modern office workspace',
    'personaId': 'baby-boomer'
})

result = response.json()
print('Generated image:', result['imageUrl'])
```

### cURL
```bash
# Generate image
curl -X POST http://localhost:5173/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Modern office workspace","personaId":"baby-boomer"}'

# Get all images
curl http://localhost:5173/api/images

# Real-time updates
curl -N http://localhost:5173/api/sse
```

## Monitoring

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "sse": "active",
  "uptime": "2h 30m",
  "version": "1.0.0"
}
```

### Metrics
```http
GET /api/metrics
```

**Response:**
```json
{
  "requests": {
    "total": 1250,
    "per_minute": 45
  },
  "images": {
    "generated": 89,
    "failed": 3,
    "success_rate": 96.7
  },
  "realtime": {
    "active_connections": 12,
    "messages_sent": 234
  }
}
```

## Versioning

API versioning follows semantic versioning:
- **v1.0.0**: Initial release with core functionality
- **v1.1.0**: Enhanced authentication and user management
- **v1.2.0**: Advanced analytics and reporting

## Changelog

### v1.0.0 (Current)
- ✅ OpenAI DALL-E 3 integration
- ✅ Real-time updates via SSE
- ✅ SQLite database with Drizzle ORM
- ✅ QR code generation and management
- ✅ Comprehensive testing suite
- ✅ Production-ready deployment

## Support

For API support and questions:
- **API Issues**: Check the error response for details
- **Rate Limits**: Implement exponential backoff
- **Real-time Issues**: Verify SSE connection support
- **Authentication**: Use session cookies for web clients

## Future Enhancements

### Planned API Features
- **WebSocket Support**: Bidirectional real-time communication
- **Bulk Operations**: Batch image generation and management
- **Advanced Filtering**: Query images by date, persona, provider
- **Export APIs**: PDF and image export functionality
- **Webhook Integration**: External service notifications

---

*API Documentation Version: 1.0.0*
*Last Updated: September 2024*