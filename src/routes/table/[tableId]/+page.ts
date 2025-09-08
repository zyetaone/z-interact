import { getTableById, getPersonaById } from '$lib/config.svelte';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export function load({ params }: Parameters<PageLoad>[0]) {
	const table = getTableById(params.tableId);

	if (!table) {
		error(404, 'Table not found');
	}

	const persona = getPersonaById(table.personaId);

	if (!persona) {
		error(404, `Persona with id '${table.personaId}' not found for table ${table.id}`);
	}

	// Return plain objects, not reactive state
	return {
		table: { ...table },
		persona: { ...persona }
	};
}
