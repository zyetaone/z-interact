import type { Persona, PromptFields } from '$lib/types';

// Scene setting and rendering specifications
export const SCENE_SETTING = `Photorealistic architectural visualization of a complete modern workspace ecosystem. Capture the entire spatial narrative from an elevated three-quarter perspective showing: multiple interconnected zones and their relationships, natural flow between collaborative, focused, and social areas, architectural elements that define the workspace character, strategic sightlines and circulation paths, environmental context through windows/skylights. The design should embody forward-thinking workspace philosophy tailored to the specific persona's generational values and professional requirements.`;

export const RENDERING_SPECS = `Hyperrealistic architectural photography | Camera: Wide-angle 24mm lens capturing full spatial context | Lighting: Natural daylight with subtle artificial accents highlighting key features | Style: Premium architectural digest quality, 8K resolution | Composition: Rule of thirds with strong leading lines drawing eye through the space | Details: Sharp focus throughout with subtle depth of field for atmosphere | Post-processing: Balanced exposure showing both bright and shadow areas clearly | <Important>Pure architectural visualization - no text, labels, watermarks, or UI elements. Emphasize materiality, spatial flow, and the interplay of light and form. Every design element should serve the persona's specific needs and values.</Important>`;

/**
 * Utility for building prompts from persona and form data
 */
export class PromptBuilder {
	/**
	 * Build a prompt for AI image generation
	 */
	static buildForGeneration(
		persona: Pick<Persona, 'id' | 'title' | 'description'>,
		formData: PromptFields
	): string {
		const parts: string[] = [];

		// Opening context - more specific and inspiring
		parts.push(
			`Create a comprehensive workspace design for ${persona.title}, ${persona.description}`
		);

		// Spatial concept
		parts.push(
			`Architectural concept: Design a complete workspace ecosystem that spans multiple zones, each purposefully crafted to support different modes of work and interaction.`
		);

		// User inputs with better framing
		if (formData.environment) {
			parts.push(`Environmental character: ${formData.environment}`);
		}

		if (formData.features) {
			parts.push(`Essential workspace elements: ${formData.features}`);
		}

		if (formData.colorPalette) {
			parts.push(`Material and color palette: ${formData.colorPalette}`);
		}

		if (formData.atmosphere) {
			parts.push(`Spatial atmosphere and emotional tone: ${formData.atmosphere}`);
		}

		if (formData.additionalFeatures) {
			parts.push(`Distinctive features: ${formData.additionalFeatures}`);
		}

		// Enhanced closing instructions
		parts.push(`${SCENE_SETTING} ${RENDERING_SPECS}`);

		return parts.join(' ');
	}

	/**
	 * Build prompt for regeneration - keeps previous context + adds variation request
	 */
	static buildForRegeneration(previousPrompt: string, userRequest?: string): string {
		if (userRequest && userRequest.trim()) {
			return `${previousPrompt} | Alternative version: ${userRequest}`;
		} else {
			return `${previousPrompt} | Show me another option with a fresh perspective and different design approach while maintaining the core requirements.`;
		}
	}

	/**
	 * Build prompt for editing - specific add/subtract/modify instructions
	 */
	static buildForEdit(
		previousPrompt: string,
		addInstructions: string,
		subtractInstructions: string,
		modifyInstructions: string
	): string {
		const parts = [previousPrompt];

		parts.push('In this existing image, make the following specific changes:');

		if (addInstructions && addInstructions.trim()) {
			parts.push(`ADD these elements: ${addInstructions.trim()}`);
		}

		if (subtractInstructions && subtractInstructions.trim()) {
			parts.push(`REMOVE these elements: ${subtractInstructions.trim()}`);
		}

		if (modifyInstructions && modifyInstructions.trim()) {
			parts.push(`MODIFY these aspects: ${modifyInstructions.trim()}`);
		}

		parts.push('Maintain all other elements exactly as they are in the original image.');

		return parts.join(' ');
	}

	/**
	 * Build a preview of the prompt for display
	 */
	static buildPreview(
		persona: Pick<Persona, 'id' | 'title' | 'description'>,
		formData: PromptFields
	): string {
		return this.buildForGeneration(persona, formData);
	}

	/**
	 * Alias for buildPreview to maintain compatibility
	 */
	static buildForDisplay(
		persona: Pick<Persona, 'id' | 'title' | 'description'>,
		formData: PromptFields
	): string {
		return this.buildPreview(persona, formData);
	}

	/**
	 * Calculate form progress percentage based on actual field requirements
	 */
	static getFormProgress(persona: Persona, formData: PromptFields): number {
		const fieldCount = persona.promptStructure.length;
		let validCount = 0;

		for (const field of persona.promptStructure) {
			const fieldKey = field.field as keyof PromptFields;
			const value = formData[fieldKey];
			const minLength = this.getFieldMinLength(fieldKey);

			if (value && value.trim().length >= minLength) {
				validCount++;
			}
		}

		return Math.round((validCount / fieldCount) * 100);
	}

	/**
	 * Get minimum length requirement for each field
	 */
	static getFieldMinLength(field: keyof PromptFields): number {
		const requirements = {
			environment: 10,
			features: 10,
			colorPalette: 5,
			atmosphere: 5,
			additionalFeatures: 0
		};
		return requirements[field] || 3;
	}

	/**
	 * Get validation errors for form fields based on minimum length requirements
	 */
	static getValidationErrors(persona: Persona, formData: PromptFields): Partial<PromptFields> {
		const errors: Partial<PromptFields> = {};

		for (const field of persona.promptStructure) {
			const fieldKey = field.field as keyof PromptFields;
			const value = formData[fieldKey];
			const minLength = this.getFieldMinLength(fieldKey);
			const isRequired = ['environment', 'features'].includes(fieldKey);

			if (isRequired && (!value || value.trim().length < minLength)) {
				const currentLength = value?.trim().length || 0;
				errors[fieldKey] =
					`Minimum ${minLength} characters required (${currentLength}/${minLength})`;
			} else if (
				!isRequired &&
				value &&
				value.trim().length > 0 &&
				value.trim().length < minLength
			) {
				const currentLength = value.trim().length;
				errors[fieldKey] = `${minLength - currentLength} more characters for completion`;
			}
		}

		return errors;
	}
}
