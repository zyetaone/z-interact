import { personas } from '$lib/personas';
import { error } from '@sveltejs/kit';

export function load({ params }) {
	const persona = personas.find(p => p.id === params.personaId);
	
	if (!persona) {
		throw error(404, 'Persona not found');
	}
	
	return {
		persona
	};
}