import * as v from 'valibot';
import type { PromptFields, Persona } from '$lib/types';

/**
 * Dynamic Valibot schema generator for workspace forms
 * Creates validation schemas based on persona requirements
 */

// Base field schema with common validations
const baseFieldSchema = (required: boolean, minLength = 10) => {
	if (required) {
		return v.pipe(
			v.string('Field must be a string'),
			v.minLength(minLength, `Must be at least ${minLength} characters`),
			v.trim()
		);
	}
	return v.optional(v.pipe(v.string('Field must be a string'), v.trim()));
};

// Create dynamic schema based on persona
export function createWorkspaceFormSchema(persona: Persona) {
	const schemaFields: Record<string, any> = {};

	// Build schema based on persona's prompt structure
	persona.promptStructure.forEach(({ field }) => {
		const required = field === 'environment' || field === 'features';
		const minLength = required ? 10 : 0;
		schemaFields[field] = baseFieldSchema(required, minLength);
	});

	// Add additional fields if not already included
	if (!schemaFields.environment) {
		schemaFields.environment = baseFieldSchema(true, 10);
	}
	if (!schemaFields.features) {
		schemaFields.features = baseFieldSchema(true, 10);
	}
	if (!schemaFields.colorPalette) {
		schemaFields.colorPalette = baseFieldSchema(false, 5);
	}
	if (!schemaFields.atmosphere) {
		schemaFields.atmosphere = baseFieldSchema(false, 5);
	}
	if (!schemaFields.additionalFeatures) {
		schemaFields.additionalFeatures = baseFieldSchema(false, 0);
	}

	return v.object(schemaFields);
}

// Validate form data using Valibot
export function validateWorkspaceForm(
	persona: Persona,
	formData: PromptFields
): v.InferOutput<ReturnType<typeof createWorkspaceFormSchema>> | null {
	try {
		const schema = createWorkspaceFormSchema(persona);
		return v.parse(schema, formData);
	} catch (error) {
		// Validation errors are expected and handled by the form
		return null;
	}
}

// Get validation errors
export function getWorkspaceFormErrors(
	persona: Persona,
	formData: PromptFields
): Record<string, string> {
	try {
		const schema = createWorkspaceFormSchema(persona);
		v.parse(schema, formData);
		return {};
	} catch (error) {
		if (v.isValiError(error)) {
			const errors: Record<string, string> = {};
			error.issues.forEach((issue) => {
				const path = issue.path?.[0]?.key;
				if (path && typeof path === 'string') {
					errors[path] = issue.message;
				}
			});
			return errors;
		}
		return {};
	}
}

// Safe parse with result
export function safeParseWorkspaceForm(
	persona: Persona,
	formData: PromptFields
): v.SafeParseResult<ReturnType<typeof createWorkspaceFormSchema>> {
	const schema = createWorkspaceFormSchema(persona);
	return v.safeParse(schema, formData);
}

// Check if a single field is valid
export function validateField(
	persona: Persona,
	field: keyof PromptFields,
	value: string
): { valid: boolean; error?: string } {
	const promptField = persona.promptStructure.find((p) => p.field === field);
	if (!promptField) {
		return { valid: true };
	}

	try {
		const required = promptField.field === 'environment' || promptField.field === 'features';
		const fieldSchema = baseFieldSchema(required, required ? 10 : 0);
		v.parse(fieldSchema, value);
		return { valid: true };
	} catch (error) {
		if (v.isValiError(error)) {
			return { valid: false, error: error.issues[0]?.message };
		}
		return { valid: false, error: 'Invalid input' };
	}
}

// Transform form data before submission
export function transformFormData(formData: PromptFields): PromptFields {
	const transformed: PromptFields = {
		environment: '',
		features: '',
		colorPalette: '',
		atmosphere: '',
		additionalFeatures: ''
	};

	// Trim and clean all fields
	Object.keys(formData).forEach((key) => {
		const typedKey = key as keyof PromptFields;
		transformed[typedKey] = formData[typedKey]?.trim() || '';
	});

	return transformed;
}

// Custom validators for specific fields
export const customValidators = {
	environment: (value: string) => {
		if (value.length < 10) {
			return 'Please provide more detail about the environment';
		}
		if (value.length > 500) {
			return 'Environment description is too long (max 500 characters)';
		}
		return null;
	},

	features: (value: string) => {
		if (value.split(',').length < 2) {
			return 'Please list at least 2 features';
		}
		return null;
	},

	colorPalette: (value: string) => {
		const colors = value.split(',').map((c) => c.trim());
		if (colors.some((color) => color.length < 3)) {
			return 'Please provide valid color names';
		}
		return null;
	}
};

// Composite validation with custom validators
export function validateWithCustomRules(
	persona: Persona,
	formData: PromptFields
): { valid: boolean; errors: Record<string, string> } {
	// First run Valibot validation
	const valibotErrors = getWorkspaceFormErrors(persona, formData);

	// Then apply custom validators
	const customErrors: Record<string, string> = {};

	Object.entries(customValidators).forEach(([field, validator]) => {
		const value = formData[field as keyof PromptFields];
		if (value && !valibotErrors[field]) {
			const error = validator(value);
			if (error) {
				customErrors[field] = error;
			}
		}
	});

	const allErrors = { ...valibotErrors, ...customErrors };
	return {
		valid: Object.keys(allErrors).length === 0,
		errors: allErrors
	};
}
