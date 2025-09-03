import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	// Pure load function - no side effects, just return initial data
	// The actual gallery initialization happens in the component via context
	return {
		// We could preload some basic gallery stats here if needed
		// But keeping it minimal to follow "no side effects" principle
	};
};