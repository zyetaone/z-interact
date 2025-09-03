import { snapshot, restore } from '$app/snapshots';

// Snapshot key for our app's ephemeral state
const SNAPSHOT_KEY = 'z-interact-ui-state';

// Interface for ephemeral UI state
interface EphemeralState {
	// Add any UI state that should persist during navigation
	// but not be stored permanently
	modalOpen?: boolean;
	selectedImageId?: string;
	formData?: Record<string, any>;
	scrollPosition?: number;
}

// Save ephemeral state to snapshot
export function saveUIState(state: EphemeralState) {
	snapshot(SNAPSHOT_KEY, state);
}

// Restore ephemeral state from snapshot
export function getUIState(): EphemeralState | null {
	return restore(SNAPSHOT_KEY) as EphemeralState | null;
}

// Helper function to create a snapshot-enabled store
export function createSnapshotStore<T>(initialValue: T, key: string) {
	let value = $state(initialValue);

	// Try to restore from snapshot on initialization
	const restored = getUIState();
	if (restored && restored[key as keyof EphemeralState]) {
		value = restored[key as keyof EphemeralState] as T;
	}

	// Create a derived store that saves to snapshot when changed
	const derivedValue = $derived(value);

	// Save to snapshot whenever value changes
	$effect(() => {
		const currentState = getUIState() || {};
		const newState = { ...currentState, [key]: derivedValue };
		saveUIState(newState);
	});

	return {
		get value() { return derivedValue; },
		set value(newValue: T) { value = newValue; }
	};
}

// Example usage for modal state that should persist during navigation
export const modalState = createSnapshotStore(false, 'modalOpen');
export const selectedImageState = createSnapshotStore<string | null>(null, 'selectedImageId');