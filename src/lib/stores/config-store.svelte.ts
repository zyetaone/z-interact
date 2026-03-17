import type { AppConfig, Persona, Table } from '$lib/types';
import { PromptBuilder } from '../config/prompt-builder';
import { defaultConfig } from '../config/app-data';

// Global configuration - reactive state using Svelte 5 runes
export const globalConfig = $state(defaultConfig);

// Persona and Table helper functions
export function getPersonaById(id: string): Persona | undefined {
	return globalConfig.personas[id];
}

export function getTableById(id: string): Table | undefined {
	return globalConfig.tables.find((table) => table.id === id);
}

export function getPersonaByTableId(tableId: string): Persona | undefined {
	const table = getTableById(tableId);
	return table ? getPersonaById(table.personaId) : undefined;
}

// Config update functions
export function updatePersonaTitle(personaId: string, title: string) {
	if (globalConfig.personas[personaId]) {
		globalConfig.personas[personaId].title = title;
	}
}

export function updatePersonaDescription(personaId: string, description: string) {
	if (globalConfig.personas[personaId]) {
		globalConfig.personas[personaId].description = description;
	}
}

export function updateEventInfo(name?: string, status?: 'active' | 'inactive' | 'upcoming') {
	if (name !== undefined) {
		globalConfig.eventInfo.name = name;
	}
	if (status !== undefined) {
		globalConfig.eventInfo.status = status;
	}
}

// Re-export prompt builder and config data
export { PromptBuilder, SCENE_SETTING, RENDERING_SPECS } from '../config/prompt-builder';
export { DEFAULT_PROMPT_FIELDS } from '../config/app-data';
export type { Persona, Table } from '$lib/types';
