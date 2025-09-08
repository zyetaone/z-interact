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

// Error Handling Types
export enum ErrorSeverity {
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	CRITICAL = 'critical'
}

export enum ErrorType {
	VALIDATION = 'validation',
	NETWORK = 'network',
	SERVER = 'server',
	CLIENT = 'client',
	AUTHENTICATION = 'authentication',
	AUTHORIZATION = 'authorization',
	NOT_FOUND = 'not_found',
	TIMEOUT = 'timeout',
	UNKNOWN = 'unknown'
}

export class AppError extends Error {
	constructor(
		message: string,
		public type: ErrorType = ErrorType.UNKNOWN,
		public severity: ErrorSeverity = ErrorSeverity.MEDIUM,
		public code?: string,
		public details?: unknown,
		public context?: string
	) {
		super(message);
		this.name = 'AppError';
	}
}

export class NetworkError extends AppError {
	constructor(
		message: string,
		public statusCode?: number,
		details?: unknown,
		context?: string
	) {
		super(message, ErrorType.NETWORK, ErrorSeverity.HIGH, 'NETWORK_ERROR', details, context);
		this.name = 'NetworkError';
	}
}

export class ValidationError extends AppError {
	constructor(
		message: string,
		public fields?: Record<string, string>,
		context?: string
	) {
		super(message, ErrorType.VALIDATION, ErrorSeverity.LOW, 'VALIDATION_ERROR', fields, context);
		this.name = 'ValidationError';
	}
}

export interface ErrorBoundaryState {
	hasError: boolean;
	error: AppError | null;
	errorId: string | null;
}

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
