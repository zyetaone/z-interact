import { config } from '$lib/config';
import { error } from '@sveltejs/kit';

export function load({ params }) {
	const table = config.tables.find(t => t.id === params.tableId);

	if (!table) {
		throw error(404, 'Table not found');
	}

	const persona = config.personas[table.personaId];

	if (!persona) {
		throw error(404, `Persona with id '${table.personaId}' not found for table ${table.id}`);
	}

	return {
		table,
		persona
	};
}
