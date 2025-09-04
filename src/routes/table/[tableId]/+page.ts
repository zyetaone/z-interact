import { globalConfig } from '$lib/config.svelte';
import { error } from '@sveltejs/kit';

export function load({ params }) {
	const table = globalConfig.tables.find((t) => t.id === params.tableId);

	if (!table) {
		throw error(404, 'Table not found');
	}

	const persona = globalConfig.personas[table.personaId];

	if (!persona) {
		throw error(404, `Persona with id '${table.personaId}' not found for table ${table.id}`);
	}

	return {
		table,
		persona
	};
}
