import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import TablePage from './+page.svelte';
import { personas } from '$lib/personas';

// Mock the page store
vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn(),
		params: { personaId: 'baby-boomer' }
	}
}));

// Mock navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock workspace store
vi.mock('$lib/stores/workspace.svelte', () => ({
	workspaceStore: {
		initialize: vi.fn(),
		isPersonaGenerating: vi.fn(() => false),
		generateImage: vi.fn(),
		lockImage: vi.fn(),
		getLockedImage: vi.fn(() => null)
	}
}));

// Mock toast store
vi.mock('$lib/stores/toast.svelte', () => ({
	toastStore: {
		success: vi.fn(),
		error: vi.fn()
	}
}));

describe('Table Flow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the correct persona information', async () => {
		render(TablePage);

		await tick();

		const babyBoomer = personas.find(p => p.id === 'baby-boomer');
		expect(babyBoomer).toBeDefined();

		await waitFor(() => {
			expect(screen.getByText(babyBoomer!.title)).toBeInTheDocument();
			expect(screen.getByText(babyBoomer!.description)).toBeInTheDocument();
		});
	});

	it('should show form fields for workspace description', async () => {
		render(TablePage);

		await tick();

		// Check for form fields
		expect(screen.getByLabelText(/workspace designed for/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/values are/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/aspirations are/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/environment looks like/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/features/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/designed to feel/i)).toBeInTheDocument();
	});

	it('should validate form before submission', async () => {
		render(TablePage);

		await tick();

		const submitButton = screen.getByRole('button', { name: /generate image/i });
		expect(submitButton).toBeInTheDocument();

		// Form should be invalid initially
		fireEvent.click(submitButton);

		// Should show validation errors
		await waitFor(() => {
			expect(screen.getByText(/please provide a more detailed description/i)).toBeInTheDocument();
		});
	});

	it('should handle successful image generation', async () => {
		const mockWorkspaceStore = await import('$lib/stores/workspace.svelte');
		const mockToastStore = await import('$lib/stores/toast.svelte');

		mockWorkspaceStore.workspaceStore.generateImage.mockResolvedValue('https://example.com/generated-image.png');

		render(TablePage);

		await tick();

		// Fill out form
		const identityField = screen.getByLabelText(/workspace designed for/i);
		fireEvent.input(identityField, { target: { value: 'A successful CEO in their 60s' } });

		const valuesField = screen.getByLabelText(/values are/i);
		fireEvent.input(valuesField, { target: { value: 'Leadership, experience, tradition, stability' } });

		const aspirationsField = screen.getByLabelText(/aspirations are/i);
		fireEvent.input(aspirationsField, { target: { value: 'Mentoring younger generations, leaving a legacy' } });

		const aestheticField = screen.getByLabelText(/environment looks like/i);
		fireEvent.input(aestheticField, { target: { value: 'Classic wood paneling, leather chairs, large windows' } });

		const featuresField = screen.getByLabelText(/features/i);
		fireEvent.input(featuresField, { target: { value: 'Large mahogany desk, bookshelves, conference area' } });

		const vibeField = screen.getByLabelText(/designed to feel/i);
		fireEvent.input(vibeField, { target: { value: 'Authoritative yet approachable, professional and warm' } });

		// Submit form
		const submitButton = screen.getByRole('button', { name: /generate image/i });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mockWorkspaceStore.workspaceStore.generateImage).toHaveBeenCalled();
			expect(mockToastStore.toastStore.success).toHaveBeenCalledWith('Image generated successfully!');
		});
	});

	it('should handle image generation errors', async () => {
		const mockWorkspaceStore = await import('$lib/stores/workspace.svelte');
		const mockToastStore = await import('$lib/stores/toast.svelte');

		mockWorkspaceStore.workspaceStore.generateImage.mockRejectedValue(new Error('Generation failed'));

		render(TablePage);

		await tick();

		// Fill out form minimally
		const identityField = screen.getByLabelText(/workspace designed for/i);
		fireEvent.input(identityField, { target: { value: 'A CEO' } });

		const valuesField = screen.getByLabelText(/values are/i);
		fireEvent.input(valuesField, { target: { value: 'Leadership' } });

		const aspirationsField = screen.getByLabelText(/aspirations are/i);
		fireEvent.input(aspirationsField, { target: { value: 'Success' } });

		const aestheticField = screen.getByLabelText(/environment looks like/i);
		fireEvent.input(aestheticField, { target: { value: 'Modern' } });

		const featuresField = screen.getByLabelText(/features/i);
		fireEvent.input(featuresField, { target: { value: 'Desk' } });

		const vibeField = screen.getByLabelText(/designed to feel/i);
		fireEvent.input(vibeField, { target: { value: 'Professional' } });

		// Submit form
		const submitButton = screen.getByRole('button', { name: /generate image/i });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mockToastStore.toastStore.error).toHaveBeenCalledWith('Failed to generate image. Please try again.');
		});
	});

	it('should show locked state when image is already submitted', async () => {
		const mockWorkspaceStore = await import('$lib/stores/workspace.svelte');

		mockWorkspaceStore.workspaceStore.getLockedImage.mockReturnValue({
			personaId: 'baby-boomer',
			personaTitle: 'The Baby Boomer',
			imageUrl: 'https://example.com/locked-image.png',
			prompt: 'A beautiful workspace',
			lockedAt: new Date().toISOString()
		});

		render(TablePage);

		await tick();

		await waitFor(() => {
			expect(screen.getByText(/submission complete/i)).toBeInTheDocument();
			expect(screen.getByAltText(/locked-in workspace/i)).toBeInTheDocument();
		});
	});
});