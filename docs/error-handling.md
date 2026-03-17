# Error Handling System

This directory contains a comprehensive, consolidated error handling system for the Z-Interact application.

## Files

- `error-handler.ts` - Consolidated error handling utilities, types, and classes
- `form-validation.ts` - Form validation utilities
- `prompt-builder.ts` - Prompt building utilities
- `qr-print.ts` - QR code printing utilities

## Core Concepts

### Error Types

The system defines standardized error types:

- `VALIDATION` - Input validation errors
- `NETWORK` - Network connectivity issues
- `SERVER` - Server-side errors
- `CLIENT` - Client-side errors
- `AUTHENTICATION` - Authentication required
- `AUTHORIZATION` - Access denied
- `NOT_FOUND` - Resource not found
- `TIMEOUT` - Request timeout
- `UNKNOWN` - Unclassified errors

### AppError Interface

All errors are standardized into `AppError` objects with:

- `type`: ErrorType classification
- `message`: Technical error message
- `userMessage`: User-friendly message
- `details`: Additional error context
- `originalError`: Original error object
- `timestamp`: When the error occurred
- `context`: Where the error occurred

## Usage Examples

### Basic Error Handling

```typescript
import { handleError, safeAsync } from '$lib/utils/error-handler';

// Handle an error with user notification
try {
	// Some operation
} catch (error) {
	handleError(error, 'operation context');
}

// Safe async operation
const result = await safeAsync(() => fetch('/api/data'), 'fetching data');

if (result.success) {
	// Use result.data
} else {
	// Handle result.error
}
```

### API Calls

```typescript
import { safeFetch } from '$lib/utils/error-handler';

// Make API calls with automatic error handling
const result = await safeFetch(
	'/api/images',
	{
		method: 'POST',
		body: JSON.stringify(data)
	},
	'creating image'
);

if (result.success) {
	// Handle success - use result.data
} else {
	// Error already shown to user via toast
	// result.error contains the AppError object
}
```

### Component Error Boundaries

```svelte
<script>
	import { createErrorBoundary } from '$lib/utils/error-handler';

	const boundary = createErrorBoundary('gallery page');
</script>

{#await boundary.wrapAsync(() => loadGalleryData())}
	<div>Loading gallery...</div>
{:then data}
	<!-- Gallery content -->
{:catch error}
	<div class="error">
		Failed to load gallery. Please try again.
		<button onclick={() => window.location.reload()}>Retry</button>
	</div>
{/await}
```

### Async Operations in Components

```svelte
<script>
	import { safeAsync } from '$lib/utils/error-handler';

	async function loadData() {
		const result = await safeAsync(() => fetch('/api/data').then((r) => r.json()), 'loading data');

		if (result.success) {
			// Handle success - use result.data
		} else {
			// Error already shown to user via toast
			// result.error contains the AppError object
		}
	}
</script>

<button onclick={loadData}>Load Data</button>
```

### Form Validation

```svelte
<script>
	import { handleError } from '$lib/utils/error-handler';

	function validateForm() {
		try {
			// Validation logic
		} catch (error) {
			handleError(error, 'form validation');
		}
	}
</script>
```

## Server-Side Error Handling

Server endpoints should use the centralized error handler:

```typescript
import { handleApiError } from '$lib/utils/error-handler';

export async function POST({ request }) {
	try {
		// Your logic
	} catch (error) {
		return handleApiError(error, event, 'operation description');
	}
}
```

For SvelteKit remote functions:

```typescript
import { handleRemoteError, AppError, ErrorType } from '$lib/utils/error-handler';

export const myCommand = command(schema, async (data) => {
	if (!data.valid) {
		handleRemoteError(new AppError('Invalid data', ErrorType.VALIDATION), 'myCommand');
	}
	// ... rest of logic
});
```

## Best Practices

1. **Always provide context** when handling errors
2. **Use appropriate error types** for better categorization
3. **Wrap async operations** in `safeAsync` or `handleWithState`
4. **Use error boundaries** around component sections
5. **Test error scenarios** to ensure graceful degradation
6. **Log errors** for debugging while showing user-friendly messages

## Components

- `ErrorBoundary` - Catches and displays component errors
- `AsyncWrapper` - Handles loading/error states for async operations
- `Toast` - Displays user notifications (already integrated)

## Migration Guide

To migrate existing error handling:

1. Replace `console.error` with `handleError`
2. Wrap API calls with `safeFetch` or `safeAsync`
3. Use `createErrorBoundary` for component error boundaries
4. Use `safeAsync` for reactive error management in components
5. Update server endpoints to use `handleApiError`
6. Update remote functions to use `handleRemoteError` with `AppError` classes
