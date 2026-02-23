import { EDITOR_TABLE_ID } from '$lib/config/tables';
import { getWorkspace, getEditHistory } from '$lib/server/db/queries';
import { ASSET_IMAGES } from '$lib/config/assets';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [workspace, history] = await Promise.all([
		getWorkspace(EDITOR_TABLE_ID),
		getEditHistory(EDITOR_TABLE_ID)
	]);

	return {
		tableId: EDITOR_TABLE_ID,
		workspace: workspace ?? null,
		history,
		assetImages: ASSET_IMAGES
	};
};
