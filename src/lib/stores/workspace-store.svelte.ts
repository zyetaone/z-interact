import type { WorkspaceData, PromptFields, WorkspaceGallery, Persona } from '$lib/types';
import { SvelteMap } from 'svelte/reactivity';
import { logger } from '$lib/utils/logger';
import { PromptBuilder, globalConfig, getPersonaById } from './config-store.svelte';
import { listImagesSince } from '../../routes/gallery/gallery.remote';

// Workspace Management - Use SvelteMap for proper reactivity
const workspaces = $state(new SvelteMap<string, WorkspaceData>());

// Initialize default workspaces
function initializeWorkspaces() {
	if (!globalConfig || !globalConfig.tables) {
		logger.error('GlobalConfig not initialized or missing tables', {
			component: 'WorkspaceStore',
			hasGlobalConfig: !!globalConfig,
			hasTables: !!globalConfig?.tables
		});
		return;
	}

	for (const table of globalConfig.tables) {
		if (!workspaces.has(table.id)) {
			const defaultFormFields: PromptFields = {
				environment: '',
				features: '',
				colorPalette: '',
				atmosphere: '',
				additionalFeatures: ''
			};

			const workspace: WorkspaceData = {
				id: table.id,
				personaId: table.personaId,
				displayName: table.displayName,
				status: 'empty',
				gallery: null,
				form: {
					fields: defaultFormFields,
					progress: 0,
					errors: {}
				},
				generation: {
					isActive: false,
					progress: 0
				},
				isLocked: false,
				activity: {
					current: 'idle',
					lastUpdated: Date.now()
				}
			};

			workspaces.set(table.id, workspace);
		}
	}
}

// Initialize on module load
initializeWorkspaces();

// Derived values
const _allWorkspaces = $derived(Array.from(workspaces.values()));
const _completedWorkspaces = $derived(_allWorkspaces.filter((w) => w.isLocked));
const _activeWorkspaces = $derived(
	_allWorkspaces.filter((w) => w.status !== 'empty' && !w.isLocked)
);
const _overallProgress = $derived(
	Math.round((_completedWorkspaces.length / globalConfig.tables.length) * 100)
);
const _progressBadges = $derived(
	_allWorkspaces.reduce(
		(acc, workspace) => {
			acc[workspace.id] = {
				progress: workspace.form.progress,
				hasImage: !!workspace.gallery?.currentUrl,
				isLocked: workspace.isLocked,
				isActive: workspace.activity.current !== 'idle' && !workspace.isLocked
			};
			return acc;
		},
		{} as Record<
			string,
			{ progress: number; hasImage: boolean; isLocked: boolean; isActive: boolean }
		>
	)
);

// getPersonaById is now imported from config-store

// Core workspace management functions
export function getWorkspace(workspaceId: string): WorkspaceData | undefined {
	// Ensure workspaces are initialized
	if (workspaces.size === 0) {
		logger.debug('Initializing workspaces', {
			component: 'WorkspaceStore',
			workspaceId
		});
		initializeWorkspaces();
	}

	const workspace = workspaces.get(workspaceId);
	if (!workspace) {
		logger.warn('Workspace not found', {
			component: 'WorkspaceStore',
			workspaceId,
			availableWorkspaces: Array.from(workspaces.keys())
		});
	}

	return workspace;
}

export function updateWorkspace(workspaceId: string, updates: Partial<WorkspaceData>): void {
	const current = workspaces.get(workspaceId);
	if (current) {
		const updated: WorkspaceData = {
			...current,
			...updates,
			activity: {
				...current.activity,
				...updates.activity,
				lastUpdated: Date.now()
			}
		};
		workspaces.set(workspaceId, updated);
	}
}

export function updateWorkspaceForm(workspaceId: string, formFields: Partial<PromptFields>): void {
	const current = workspaces.get(workspaceId);
	if (current) {
		const updatedFields = { ...current.form.fields, ...formFields };
		const persona = getPersonaById(current.personaId);
		const progress = persona ? PromptBuilder.getFormProgress(persona, updatedFields) : 0;
		const errors = persona ? PromptBuilder.getValidationErrors(persona, updatedFields) : {};

		updateWorkspace(workspaceId, {
			form: {
				fields: updatedFields,
				progress,
				errors
			},
			status: progress > 0 ? 'form-active' : 'empty',
			activity: {
				...current.activity,
				current: 'form_edit'
			}
		});
	}
}

export function setWorkspaceGallery(
	workspaceId: string,
	imageUrl: string,
	prompt: string,
	provider: WorkspaceGallery['provider'] = null,
	isTemporary: boolean = false
): void {
	const current = workspaces.get(workspaceId);
	if (current) {
		const safePrompt = String(prompt ?? '').slice(0, 1000);
		const gallery: WorkspaceGallery = {
			currentUrl: imageUrl,
			previousUrl: current.gallery?.previousUrl || null,
			originalUrl: current.gallery?.originalUrl || imageUrl,
			isEdited: current.gallery?.originalUrl ? current.gallery.originalUrl !== imageUrl : false,
			provider,
			isTemporary,
			prompt: safePrompt,
			generatedAt: Date.now()
		};

		updateWorkspace(workspaceId, {
			gallery,
			status: isTemporary ? 'generating' : 'generated',
			activity: {
				...current.activity,
				current: isTemporary ? 'generating' : 'generated'
			}
		});
	}
}

export function applyWorkspaceEdit(
	workspaceId: string,
	editPrompt: string,
	newImageUrl: string
): void {
	const current = workspaces.get(workspaceId);
	if (current?.gallery) {
		const currentEditCount = current.gallery.editCount ?? 0;
		const appended = `${current.gallery.prompt} <hr> Edit: ${editPrompt}`.slice(0, 1000);
		const gallery: WorkspaceGallery = {
			...current.gallery,
			previousUrl: current.gallery.currentUrl,
			currentUrl: newImageUrl,
			isEdited: true,
			editCount: currentEditCount + 1,
			prompt: appended
		};

		updateWorkspace(workspaceId, {
			gallery,
			status: 'generated',
			activity: {
				...current.activity,
				current: 'edited'
			}
		});
	}
}

export function applyWorkspaceRegenerate(
	workspaceId: string,
	newImageUrl: string,
	newPrompt: string
): void {
	const current = workspaces.get(workspaceId);
	if (current?.gallery) {
		const currentEditCount = current.gallery.editCount ?? 0;
		const gallery: WorkspaceGallery = {
			...current.gallery,
			previousUrl: current.gallery.currentUrl,
			currentUrl: newImageUrl,
			prompt: newPrompt,
			isEdited: true,
			editCount: currentEditCount + 1
		};

		updateWorkspace(workspaceId, {
			gallery,
			status: 'generated',
			activity: {
				...current.activity,
				current: 'generated'
			}
		});
	}
}

export function revertWorkspaceGallery(workspaceId: string): boolean {
	const current = workspaces.get(workspaceId);
	if (current?.gallery?.originalUrl && current.gallery.originalUrl !== current.gallery.currentUrl) {
		const gallery: WorkspaceGallery = {
			...current.gallery,
			previousUrl: current.gallery.currentUrl,
			currentUrl: current.gallery.originalUrl,
			isEdited: false
		};

		updateWorkspace(workspaceId, {
			gallery,
			activity: {
				...current.activity,
				current: 'generated'
			}
		});
		return true;
	}
	return false;
}

export function undoWorkspaceEdit(workspaceId: string): boolean {
	const current = workspaces.get(workspaceId);
	if (current?.gallery?.previousUrl) {
		const tempUrl = current.gallery.currentUrl;
		const gallery: WorkspaceGallery = {
			...current.gallery,
			currentUrl: current.gallery.previousUrl,
			previousUrl: tempUrl
		};

		updateWorkspace(workspaceId, {
			gallery,
			activity: {
				...current.activity,
				current: 'generated'
			}
		});
		return true;
	}
	return false;
}

export function canUndoWorkspaceEdit(workspaceId: string): boolean {
	const current = workspaces.get(workspaceId);
	return !!current?.gallery?.previousUrl;
}

export function hasReachedUsageLimit(workspaceId: string): boolean {
	const current = workspaces.get(workspaceId);
	const editCount = current?.gallery?.editCount ?? 0;
	return editCount >= 20;
}

export function getRemainingEdits(workspaceId: string): number {
	const current = workspaces.get(workspaceId);
	const editCount = current?.gallery?.editCount ?? 0;
	return Math.max(0, 20 - editCount);
}

export function lockWorkspace(workspaceId: string): void {
	const current = workspaces.get(workspaceId);
	if (current?.gallery) {
		const gallery: WorkspaceGallery = {
			...current.gallery,
			lockedAt: Date.now()
		};

		updateWorkspace(workspaceId, {
			gallery,
			isLocked: true,
			status: 'locked',
			activity: {
				...current.activity,
				current: 'locked'
			}
		});
	}
}

export function unlockWorkspace(workspaceId: string): void {
	const current = workspaces.get(workspaceId);
	if (current?.gallery) {
		const gallery: WorkspaceGallery = {
			...current.gallery,
			lockedAt: undefined
		};

		updateWorkspace(workspaceId, {
			gallery,
			isLocked: false,
			status: 'generated',
			activity: {
				...current.activity,
				current: 'generated'
			}
		});
	}
}

// Unified sync function that fetches and updates workspaces
interface SyncOptions {
	admin?: boolean;
	tableId?: string;
	limit?: number;
	reset?: boolean;
	onSuccess?: (images: any[]) => void | Promise<void>;
	onError?: (error: any) => void;
	onFinally?: () => void;
}

const lastSinceByKey = new Map<string, number>();
function keyFor(tableId?: string) {
	return tableId ? `table:${tableId}` : 'all';
}

export async function syncWorkspaces(options: SyncOptions = {}) {
	const {
		admin = true,
		tableId,
		limit = 100,
		reset = false,
		onSuccess,
		onError,
		onFinally
	} = options;

	try {
		const key = keyFor(tableId);
		const last = reset ? 0 : lastSinceByKey.get(key) || 0;

		// Fetch images from remote
		const images = await listImagesSince({
			since: last,
			admin,
			...(tableId && { tableId }),
			limit
		});

		// Update tracking
		if (images && images.length > 0) {
			const maxTs = images.reduce((acc: number, img: any) => {
				const ts = (img.updatedAt ?? img.createdAt ?? 0) as number;
				return ts > acc ? ts : acc;
			}, last);
			lastSinceByKey.set(key, maxTs || Date.now());
		}

		// Sync workspaces with fetched data
		logger.info('Syncing workspaces with database', {
			component: 'WorkspaceStore',
			count: images.length
		});

		for (const img of images) {
			if (img.tableId && img.imageUrl) {
				setWorkspaceGallery(img.tableId, img.imageUrl, img.prompt || '', null, false);
				lockWorkspace(img.tableId);

				logger.debug('Workspace synced with locked image', {
					component: 'WorkspaceStore',
					tableId: img.tableId
				});
			}
		}

		// Call success callback
		if (onSuccess) {
			await onSuccess(images);
		}

		return images;
	} catch (error) {
		logger.error('Workspace sync failed', { component: 'WorkspaceStore' }, error as any);
		if (onError) {
			onError(error);
		}
		throw error;
	} finally {
		if (onFinally) {
			onFinally();
		}
	}
}

// Legacy sync function for backward compatibility
export async function syncWorkspacesWithDatabase(
	existingImages: Array<{
		id: string;
		tableId: string;
		imageUrl: string;
		prompt: string;
		personaId: string;
		createdAt?: number;
	}>
) {
	logger.info('Syncing workspaces with database', {
		component: 'WorkspaceStore',
		count: existingImages.length
	});

	for (const img of existingImages) {
		if (img.tableId && img.imageUrl) {
			setWorkspaceGallery(img.tableId, img.imageUrl, img.prompt || '', null, false);
			lockWorkspace(img.tableId);

			logger.debug('Workspace synced with locked image', {
				component: 'WorkspaceStore',
				tableId: img.tableId
			});
		}
	}
}

// Admin functions
export function clearAllLocks() {
	logger.info('Admin: Clearing all locked workspaces', { component: 'WorkspaceStore' });

	for (const workspace of _allWorkspaces) {
		if (workspace.isLocked) {
			unlockWorkspace(workspace.id);
		}
	}

	logger.info('All workspaces unlocked', { component: 'WorkspaceStore' });
}

export function resetAllWorkspaces() {
	logger.info('Admin: Resetting all workspaces', { component: 'WorkspaceStore' });
	workspaces.clear();
	initializeWorkspaces();
	logger.info('All workspaces reset to initial state', { component: 'WorkspaceStore' });
}

// Getter functions for derived values
export function getAllWorkspaces() {
	return _allWorkspaces;
}

export function getCompletedWorkspaces() {
	return _completedWorkspaces;
}

export function getActiveWorkspaces() {
	return _activeWorkspaces;
}

export function getProgressBadges() {
	return _progressBadges;
}

export function getOverallProgress() {
	return _overallProgress;
}
