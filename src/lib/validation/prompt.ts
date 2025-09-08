import * as v from 'valibot';
import type { PromptFields, Persona } from '$lib/types';

// Schema: all prompt fields required with min length 3
export const PromptFieldsSchema = v.object({
	environment: v.pipe(v.string(), v.minLength(3, 'Please describe at least 3 characters.')),
	features: v.pipe(v.string(), v.minLength(3, 'Please describe at least 3 characters.')),
	colorPalette: v.pipe(v.string(), v.minLength(3, 'Please describe at least 3 characters.')),
	atmosphere: v.pipe(v.string(), v.minLength(3, 'Please describe at least 3 characters.')),
	additionalFeatures: v.pipe(v.string(), v.minLength(3, 'Please describe at least 3 characters.'))
});

export function validatePrompt(_persona: Persona, formData: PromptFields): boolean {
	const res = v.safeParse(PromptFieldsSchema, formData);
	return res.success;
}

export function getPromptErrors(_persona: Persona, formData: PromptFields): Partial<PromptFields> {
	const res = v.safeParse(PromptFieldsSchema, formData);
	if (res.success) return {};

	const errors: Partial<PromptFields> = {};
	for (const issue of res.issues || []) {
		const path = issue?.path?.[0]?.key as keyof PromptFields | undefined;
		if (path) errors[path] = issue.message as any;
	}
	return errors;
}

export function getPromptProgress(persona: Persona, formData: PromptFields): number {
	if (!persona) return 0;
	const activeFields = persona.promptStructure.map((c) => c.field);
	const filled = activeFields.filter((field) => {
		const value = formData[field as keyof PromptFields];
		return !!value && value.trim().length >= 3;
	}).length;
	return Math.round((filled / activeFields.length) * 100);
}
