# Unified Error Handling System

## Overview

This document describes the consolidated error handling architecture that provides consistent, maintainable error handling across the entire application.

## Architecture

The unified error handling system consists of:

### 1. Centralized Error Types and Utilities (`src/lib/types/errors.ts`)

- **Single source of truth** for all error-related types, classes, and utilities
- Core error types: `AppError`, `NetworkError`, `ValidationError`
- Error classification, creation, and message handling
- Server-side API response helpers
- Error recovery patterns (retry, fallback, circuit breaker)

### 2. Client-side Error Handler (`src/lib/utils/error-handler.ts`)

- Browser-specific error handling functionality
- Toast notifications and console logging
- Re-exports centralized utilities for convenience

### 3. Server-side Error Handler (`src/lib/server/error-handler.server.ts`)

- Re-exports centralized utilities for server use
- Maintains backward compatibility

### 4. Error Boundary Component (`src/lib/components/ErrorBoundary.svelte`)

- Provides graceful error handling for component trees
- Customizable fallback UI and error handling logic

## Key Features

### Error Classification

Errors are automatically classified into types:

- `VALIDATION` - Input validation errors
- `NETWORK` - Network connectivity issues
- `SERVER` - Server-side errors
- `CLIENT` - Client-side application errors
- `AUTHENTICATION` - Authentication failures
- `AUTHORIZATION` - Permission errors
- `NOT_FOUND` - Resource not found
- `TIMEOUT` - Request timeouts
- `UNKNOWN` - Unclassified errors

### Error Severity Levels

- `LOW` - Minor issues, typically validation errors
- `MEDIUM` - Standard application errors
- `HIGH` - Serious errors affecting functionality
- `CRITICAL` - System-critical errors

### User-friendly Messages

Each error type has predefined user-friendly messages that hide technical details while providing helpful guidance.

### Error Recovery Patterns

- **Retry with Exponential Backoff** - Automatic retry with increasing delays
- **Fallback Values** - Graceful degradation with default values
- **Circuit Breaker** - Prevents cascade failures by temporarily disabling failing services

## Usage Examples

### Basic Error Handling

```typescript
import { handleError } from '$lib/utils/error-handler';

try {
	// Risky operation
	throw new Error('Something went wrong');
} catch (error) {
	handleError(error, 'Operation context', {
		showToast: true,
		logToConsole: true
	});
}
```

### Safe Async Operations

```typescript
import { safeAsync } from '$lib/utils/error-handler';

const result = await safeAsync(async () => {
	// Async operation that might fail
	return await riskyAsyncOperation();
}, 'Risky Operation');

if (result.success) {
	console.log('Success:', result.data);
} else {
	console.log('Error:', result.error.getUserMessage());
}
```

### Error Recovery with Retry

```typescript
import { ErrorRecovery } from '$lib/types/errors';

const result = await ErrorRecovery.retry(
	async () => {
		// Operation that might fail temporarily
		return await unreliableOperation();
	},
	3, // max attempts
	1000, // base delay in ms
	(error) => error instanceof NetworkError // retry condition
);
```

### Form Validation Errors

```typescript
import { ValidationError } from '$lib/types/errors';

const validationError = new ValidationError('Form validation failed', {
	email: 'Invalid email format',
	password: 'Password too short'
});

handleError(validationError, 'Form submission');
```

### Error Boundaries in Components

```svelte
<script>
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
</script>

<ErrorBoundary
	context="User Profile"
	showToast={true}
	onError={(error) => console.log('Profile error:', error)}
>
	<UserProfileComponent />
</ErrorBoundary>
```

### Custom Error Types

```typescript
import { AppError, ErrorType, ErrorSeverity } from '$lib/types/errors';

class BusinessLogicError extends AppError {
	constructor(message: string, businessCode: string) {
		super(message, ErrorType.CLIENT, ErrorSeverity.HIGH, businessCode, { businessLogic: true });
	}
}

const businessError = new BusinessLogicError('Cannot process order', 'ORDER_LIMIT_EXCEEDED');
```

## API Integration

### Server Endpoints

```typescript
import { handleApiError } from '$lib/server/error-handler.server';

export async function POST(event) {
	try {
		// API logic
		return new Response(JSON.stringify({ success: true }));
	} catch (error) {
		return handleApiError(error, event, 'Order processing');
	}
}
```

### Remote Functions (SvelteKit)

```typescript
import { error } from '@sveltejs/kit';

export const processOrder = command(schema, async (data) => {
	try {
		// Process order
		return { success: true, orderId: '123' };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Processing failed';
		error(500, message);
	}
});
```

## Configuration Options

### ErrorHandlerConfig Interface

```typescript
interface ErrorHandlerConfig {
	logToConsole?: boolean; // Log to browser console (default: true)
	showToast?: boolean; // Show toast notification (default: true)
	throwError?: boolean; // Re-throw after handling (default: false)
	customHandler?: (error: AppError) => void; // Custom handling logic
	severity?: ErrorSeverity; // Override error severity
	context?: string; // Additional context information
}
```

## Best Practices

### 1. Use Centralized Error Handling

Always use `handleError()` instead of raw `console.error()` for consistent error processing.

### 2. Provide Context

Include meaningful context information when handling errors:

```typescript
handleError(error, 'Image upload process');
```

### 3. Choose Appropriate Severity

Set severity levels appropriately to control user notifications:

- Use `LOW` for validation errors
- Use `MEDIUM` for most application errors
- Use `HIGH` for serious functionality issues
- Use `CRITICAL` for system failures

### 4. Implement Error Recovery

Use retry logic and fallbacks for resilient applications:

```typescript
const result = await ErrorRecovery.fallback(() => primaryService(), defaultValue);
```

### 5. Use Error Boundaries

Wrap component trees in error boundaries to prevent complete application crashes:

```svelte
<ErrorBoundary context="Feature Section">
	<FeatureComponent />
</ErrorBoundary>
```

### 6. Handle Async Operations Safely

Use `safeAsync()` for operations that might fail:

```typescript
const result = await safeAsync(riskyOperation, 'Data fetch');
```

### 7. Validate User Input

Create descriptive validation errors with field-specific messages:

```typescript
const validationError = new ValidationError('Please correct the following fields', {
	username: 'Username is required',
	email: 'Invalid email format'
});
```

## Migration Guide

### From Old Error Handling

Replace scattered error handling with centralized approach:

**Before:**

```typescript
try {
	// operation
} catch (error) {
	console.error(error);
	toast.error('Something went wrong');
}
```

**After:**

```typescript
try {
	// operation
} catch (error) {
	handleError(error, 'Operation name');
}
```

### Component Error Handling

Wrap existing components with error boundaries:

**Before:**

```svelte
<UserComponent />
```

**After:**

```svelte
<ErrorBoundary context="User Component">
	<UserComponent />
</ErrorBoundary>
```

## File Structure

```
src/lib/
├── types/
│   └── errors.ts              # Centralized error system (SSOT)
├── utils/
│   └── error-handler.ts       # Client-side utilities
├── server/
│   └── error-handler.server.ts # Server-side utilities
└── components/
    ├── ErrorBoundary.svelte   # Error boundary component
    └── examples/
        └── ErrorHandlingExample.svelte # Usage examples
```

## Benefits

1. **Consistency** - Uniform error handling across the entire application
2. **Maintainability** - Single source of truth for error logic
3. **User Experience** - User-friendly error messages and notifications
4. **Developer Experience** - Clear APIs and comprehensive logging
5. **Reliability** - Built-in retry and recovery mechanisms
6. **Scalability** - Easy to extend with new error types and handlers

## Testing

The error handling system should be tested with:

- Unit tests for error classification and creation
- Integration tests for API error responses
- End-to-end tests for user error scenarios
- Error boundary testing with deliberate component failures

This unified system provides a solid foundation for robust, user-friendly error handling throughout the application.
