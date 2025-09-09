import * as v from 'valibot';
import {
	personaIdPipe,
	optionalTableIdPipe,
	promptPipe,
	requiredStringPipe,
	urlPipe,
	optionalUrlPipe,
	limitPipe,
	optionalLimitPipe,
	timestampPipe,
	uuidPipe
} from './common';

// AI Generation Schemas
export const GenerateImageSchema = v.object({
	prompt: promptPipe,
	personaId: personaIdPipe,
	tableId: optionalTableIdPipe
});

export const LockImageSchema = v.object({
	personaId: personaIdPipe,
	imageUrl: urlPipe,
	prompt: promptPipe,
	tableId: optionalTableIdPipe
});

export const EditImageSchema = v.object({
	imageUrl: urlPipe,
	editPrompt: promptPipe,
	personaId: v.optional(personaIdPipe),
	tableId: optionalTableIdPipe
});

// Gallery Schemas
export const ListImagesSchema = v.optional(
	v.object({
		admin: v.optional(v.boolean()),
		limit: optionalLimitPipe
	})
);

export const ImageIdSchema = v.object({
	imageId: uuidPipe
});

export const DeleteImageSchema = v.object({
	imageId: uuidPipe
});

export const ListImagesSinceSchema = v.object({
	since: timestampPipe,
	limit: optionalLimitPipe,
	admin: v.optional(v.boolean()),
	tableId: optionalTableIdPipe
});

// Upload Schemas
export const UploadSchema = v.object({
	filename: requiredStringPipe('Filename'),
	mime: requiredStringPipe('MIME type'),
	bytes: v.unknown()
});

export const UploadImageUrlSchema = v.object({
	imageUrl: urlPipe,
	personaId: personaIdPipe,
	tableId: optionalTableIdPipe,
	prompt: promptPipe
});

export const UploadBlobSchema = v.object({
	base64: requiredStringPipe('Base64 data'),
	mimeType: requiredStringPipe('MIME type'),
	personaId: personaIdPipe,
	tableId: optionalTableIdPipe,
	prompt: promptPipe
});

// R2 Storage Schemas
export const UploadFromUrlSchema = v.object({
	imageUrl: urlPipe,
	filename: requiredStringPipe('Filename')
});

export const UploadFromBase64Schema = v.object({
	base64Data: requiredStringPipe('Base64 data'),
	filename: requiredStringPipe('Filename')
});

export const UploadFromBufferSchema = v.object({
	buffer: v.unknown(),
	filename: requiredStringPipe('Filename'),
	contentType: v.optional(requiredStringPipe('Content type'))
});

export const DeleteFromR2Schema = v.object({
	filename: requiredStringPipe('Filename')
});

// Subscribe Schema
export const SubscribeSchema = v.object({
	since: v.optional(timestampPipe),
	tableId: v.optional(v.pipe(personaIdPipe, v.minLength(1), v.maxLength(10))),
	limit: optionalLimitPipe
});

// Type inference exports for better type safety
export type GenerateImageRequest = v.InferInput<typeof GenerateImageSchema>;
export type LockImageRequest = v.InferInput<typeof LockImageSchema>;
export type EditImageRequest = v.InferInput<typeof EditImageSchema>;
export type ListImagesRequest = v.InferInput<typeof ListImagesSchema>;
export type ImageIdRequest = v.InferInput<typeof ImageIdSchema>;
export type DeleteImageRequest = v.InferInput<typeof DeleteImageSchema>;
export type ListImagesSinceRequest = v.InferInput<typeof ListImagesSinceSchema>;
export type UploadRequest = v.InferInput<typeof UploadSchema>;
export type UploadImageUrlRequest = v.InferInput<typeof UploadImageUrlSchema>;
export type UploadBlobRequest = v.InferInput<typeof UploadBlobSchema>;
export type UploadFromUrlRequest = v.InferInput<typeof UploadFromUrlSchema>;
export type UploadFromBase64Request = v.InferInput<typeof UploadFromBase64Schema>;
export type UploadFromBufferRequest = v.InferInput<typeof UploadFromBufferSchema>;
export type DeleteFromR2Request = v.InferInput<typeof DeleteFromR2Schema>;
export type SubscribeRequest = v.InferInput<typeof SubscribeSchema>;
