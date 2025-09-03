import type { PageLoad } from './$types';

// Handle slide parameter for QR code navigation
export const prerender = false;

export const load: PageLoad = ({ url }) => {
	const slideParam = url.searchParams.get('slide');
	const initialSlide = slideParam ? parseInt(slideParam, 10) : 0;

	return {
		initialSlide
	};
};
