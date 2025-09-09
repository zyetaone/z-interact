// Centralized type definitions for the application

// Platform and Environment Types
export type Platform =
	| {
			env?: Record<string, unknown>;
			readonly [key: string]: unknown;
	  }
	| undefined;

export interface CloudflarePlatform {
	env: {
		z_interact_db?: unknown; // D1Database type from Cloudflare Workers
		FAL_API_KEY?: string;
		R2_ACCESS_KEY_ID?: string;
		R2_SECRET_ACCESS_KEY?: string;
		R2_ACCOUNT_ID?: string;
		R2_BUCKET_NAME?: string;
		R2_IMAGES?: unknown; // R2 bucket type from Cloudflare Workers
		R2_PUBLIC_URL?: string;
		[key: string]: unknown;
	};
	readonly [key: string]: unknown;
}

// API Response Types
export interface ApiSuccessResponse<T = unknown> {
	success: true;
	data: T;
}

export interface ApiErrorResponse {
	success: false;
	error: string;
	message?: string;
	details?: unknown;
	type?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// Image Generation Types
export interface ImageGenerationOptions {
	prompt: string;
	personaId?: string;
	tableId?: string;
}

export interface ImageGenerationResult {
	imageUrl: string;
	provider: string;
	prompt: string;
	metadata?: ImageGenerationMetadata;
}

export interface ImageGenerationMetadata {
	model?: string;
	generationTime?: string;
	requestId?: string;
	enhancedPrompt?: string;
	cost?: number;
	fallback?: boolean;
	reason?: string;
	[key: string]: unknown; // Allow additional metadata properties
}

// Database Types
export interface DatabaseImage {
	id: string;
	sessionId: string | null;
	participantId: string | null;
	personaId: string;
	personaTitle: string | null;
	tableId: string | null;
	imageUrl: string | null;
	prompt: string;
	provider: string;
	status: string;
	createdAt: number; // Unix timestamp (milliseconds)
	updatedAt: number | null; // Unix timestamp (milliseconds)
}

export interface NewDatabaseImage {
	id: string;
	sessionId?: string | null;
	participantId?: string | null;
	personaId: string;
	personaTitle?: string | null;
	tableId?: string | null;
	imageUrl?: string | null;
	prompt: string;
	provider?: string;
	status?: string;
	createdAt: number; // Unix timestamp (milliseconds)
	updatedAt: number | null; // Unix timestamp (milliseconds)
}

// Validation Schema Types
export type ValidationResult<T> =
	| { success: true; data: T }
	| { success: false; response: Response };

// Form and UI Types
export interface PromptFields {
	environment: string;
	features: string;
	colorPalette: string;
	atmosphere: string;
	additionalFeatures: string;
}

export interface Persona {
	id: string;
	title: string;
	description: string;
	promptStructure: PromptFieldConfig[];
}

export interface PromptFieldConfig {
	label: string;
	field: keyof PromptFields;
	fieldSuggestions: FieldSuggestions;
}

export interface FieldSuggestions {
	placeholder: string;
	suggestions: string;
}

export interface LockedImage {
	tableId: string;
	personaId: string;
	imageUrl: string;
	prompt: string;
	lockedAt?: string;
}

// Component Props Types
export interface QRCodeGeneratorProps {
	url: string;
	size?: number;
	class?: string;
}

// Simple error types for basic error handling with svelte:boundary

// Utility Types
export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Request/Response Types for API endpoints
export interface GenerateImageRequest {
	prompt: string;
	personaId: string;
	tableId?: string;
	taskId?: string;
}

export interface SaveImageRequest {
	personaId: string;
	imageUrl: string;
	prompt: string;
	tableId?: string;
}

export interface ImageListResponse {
	images: DatabaseImage[];
	total: number;
}

// Storage Types

// AI Service Types
export interface FalLogEntry {
	message: string;
	timestamp?: string;
	level?: string;
}

export interface FalQueueUpdate {
	status: string;
	logs?: FalLogEntry[];
	progress?: number;
}

// Button Component Types
export type ButtonVariant =
	| 'primary'
	| 'secondary'
	| 'success'
	| 'danger'
	| 'warning'
	| 'info'
	| 'light'
	| 'dark';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Gallery Types
export interface GalleryImage extends DatabaseImage {
	displayUrl?: string;
	thumbnailUrl?: string;
	error?: string;
}

// No serialization needed - numbers are POJO-friendly
export type SerializedImage = DatabaseImage;

// Table Types
export interface Table {
	id: string;
	displayName: string;
	personaId: string;
}

// Workspace Management Types
export interface WorkspaceGallery {
	currentUrl: string | null;
	previousUrl: string | null; // Simple undo: swap current with previous
	originalUrl: string | null;
	isEdited: boolean;
	provider: 'fal.ai' | 'dall-e' | 'upload' | null;
	isTemporary: boolean;
	prompt: string;
	generatedAt?: number;
	lockedAt?: number;
	editCount?: number; // Track number of edit/regenerate operations (max 20)
}

export interface WorkspaceData {
	// Identity
	id: string;
	personaId: string;
	displayName: string;

	// Workspace status
	status: 'empty' | 'form-active' | 'generating' | 'generated' | 'editing' | 'locked';

	// Gallery management (with revert support)
	gallery: WorkspaceGallery | null;

	// Form data
	form: {
		fields: PromptFields;
		progress: number;
		errors: Partial<PromptFields>;
	};

	// Generation tracking
	generation: {
		isActive: boolean;
		progress: number;
	};

	// Lock status
	isLocked: boolean;

	// Activity tracking
	activity: {
		current: 'idle' | 'form_edit' | 'generating' | 'generated' | 'edited' | 'locked';
		lastUpdated: number;
		sessionStarted?: number;
	};
}

// App Configuration Types
export interface AppConfig {
	masterSystemPrompt: string;
	personas: Record<string, Persona>;
	tables: Table[];
	eventInfo: {
		name: string;
		status: 'active' | 'inactive' | 'upcoming';
	};
}

// Temporary compatibility exports (will be removed after migration)
export type TableState = WorkspaceData;
export type TableImageState = WorkspaceGallery;
