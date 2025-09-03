<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button as ButtonRoot, Dialog as DialogRoot, Label, Textarea } from 'bits-ui';

	let {
		slideData = $bindable([]),
		currentSlide = $bindable(0),
		isDashboardOpen = $bindable(false),
		onSlideChange
	} = $props();

	let isEditing = $state(false);
	let editingSlideIndex = $state(-1);
	let editTitle = $state('');
	let editContent = $state('');
	let editNotes = $state('');

	function goToSlide(index: number) {
		currentSlide = index;
		onSlideChange?.(index);
	}

	function addSlide() {
		const newSlide = {
			title: 'New Slide',
			content: '<p>New slide content</p>',
			notes: 'Presenter notes for this slide'
		};
		slideData = [...slideData, newSlide];
		goToSlide(slideData.length - 1);
	}

	function deleteSlide(index: number) {
		if (slideData.length <= 1) return; // Keep at least one slide
		slideData = slideData.filter((_, i) => i !== index);
		if (currentSlide >= slideData.length) {
			currentSlide = slideData.length - 1;
		}
	}

	function startEditing(index: number) {
		editingSlideIndex = index;
		editTitle = slideData[index].title;
		editContent = slideData[index].content;
		editNotes = slideData[index].notes || '';
		isEditing = true;
	}

	function saveEdit() {
		if (editingSlideIndex >= 0) {
			slideData = slideData.map((slide, index) =>
				index === editingSlideIndex
					? { ...slide, title: editTitle, content: editContent, notes: editNotes }
					: slide
			);
		}
		isEditing = false;
		editingSlideIndex = -1;
	}

	function cancelEdit() {
		isEditing = false;
		editingSlideIndex = -1;
	}

	function moveSlide(fromIndex: number, toIndex: number) {
		const slides = [...slideData];
		const [movedSlide] = slides.splice(fromIndex, 1);
		slides.splice(toIndex, 0, movedSlide);
		slideData = slides;

		// Adjust current slide index if necessary
		if (currentSlide === fromIndex) {
			currentSlide = toIndex;
		} else if (currentSlide > fromIndex && currentSlide <= toIndex) {
			currentSlide--;
		} else if (currentSlide < fromIndex && currentSlide >= toIndex) {
			currentSlide++;
		}
	}

	function nextSlide() {
		if (currentSlide < slideData.length - 1) {
			goToSlide(currentSlide + 1);
		}
	}

	function prevSlide() {
		if (currentSlide > 0) {
			goToSlide(currentSlide - 1);
		}
	}

	// Generate thumbnail content (simplified version)
	function getThumbnailContent(slide: any) {
		// Remove HTML tags and get first 50 characters
		const textContent = slide.content.replace(/<[^>]*>/g, '').substring(0, 50);
		return textContent + (slide.content.length > 50 ? '...' : '');
	}
</script>

<DialogRoot bind:open={isDashboardOpen}>
	<DialogRoot.Content class="max-h-[90vh] max-w-6xl overflow-hidden">
		<div class="border-b p-6">
			<DialogRoot.Title class="text-xl font-semibold">Presenter Dashboard</DialogRoot.Title>
			<DialogRoot.Description class="mt-1 text-gray-600">
				Manage your presentation slides and navigate through them.
			</DialogRoot.Description>
		</div>

		<div class="grid h-[70vh] grid-cols-12 gap-6">
			<!-- Slide Thumbnails -->
			<div class="col-span-3 overflow-y-auto border-r border-gray-200 pr-4">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-semibold">Slides</h3>
					<ButtonRoot variant="outline" size="sm" onclick={addSlide}>+ Add Slide</ButtonRoot>
				</div>

				<div class="space-y-2">
					{#each slideData as slide, index}
						<div
							class={cn(
								'cursor-pointer rounded-lg border p-3 transition-colors',
								index === currentSlide
									? 'border-blue-500 bg-blue-50'
									: 'border-gray-200 hover:border-gray-300'
							)}
							onclick={() => goToSlide(index)}
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									goToSlide(index);
								}
							}}
							role="button"
							tabindex="0"
							aria-label={`Go to slide ${index + 1}: ${slideData[index].title}`}
						>
							<div class="mb-2 flex items-center justify-between">
								<span class="text-sm font-medium text-gray-900">
									{index + 1}. {slide.title}
								</span>
								<div class="flex gap-1">
									<ButtonRoot
										variant="ghost"
										size="sm"
										onclick={(e: Event) => {
											e.stopPropagation();
											startEditing(index);
										}}
									>
										✏️
									</ButtonRoot>
									<ButtonRoot
										variant="ghost"
										size="sm"
										onclick={(e: Event) => {
											e.stopPropagation();
											deleteSlide(index);
										}}
										disabled={slideData.length <= 1}
									>
										🗑️
									</ButtonRoot>
								</div>
							</div>
							<div class="line-clamp-2 text-xs text-gray-600">
								{getThumbnailContent(slide)}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Current Slide Preview -->
			<div class="col-span-6 flex flex-col">
				<div class="flex-1 overflow-hidden rounded-lg bg-gray-900 p-6 text-white">
					<div class="flex h-full flex-col items-center justify-center">
						{#if slideData[currentSlide]}
							<h2 class="mb-4 text-center text-2xl font-bold">
								{slideData[currentSlide].title}
							</h2>
							<div class="flex-1 overflow-y-auto text-center">
								<div class="prose max-w-none prose-invert">
									{@html slideData[currentSlide].content}
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Navigation Controls -->
				<div class="mt-4 flex items-center justify-center gap-4">
					<ButtonRoot variant="outline" onclick={prevSlide} disabled={currentSlide === 0}>
						⬅️ Previous
					</ButtonRoot>

					<span class="text-sm text-gray-600">
						{currentSlide + 1} / {slideData.length}
					</span>

					<ButtonRoot
						variant="outline"
						onclick={nextSlide}
						disabled={currentSlide === slideData.length - 1}
					>
						Next ➡️
					</ButtonRoot>
				</div>
			</div>

			<!-- Presenter Notes -->
			<div class="col-span-3 border-l border-gray-200 pl-4">
				<h3 class="mb-4 text-lg font-semibold">Presenter Notes</h3>
				<div class="min-h-[200px] rounded-lg border border-yellow-200 bg-yellow-50 p-4">
					{#if slideData[currentSlide]?.notes}
						<div class="text-sm whitespace-pre-wrap text-gray-800">
							{slideData[currentSlide].notes}
						</div>
					{:else}
						<div class="text-sm text-gray-500 italic">
							No notes for this slide. Click edit to add some.
						</div>
					{/if}
				</div>

				<!-- Quick Actions -->
				<div class="mt-6">
					<h4 class="text-md mb-3 font-semibold">Quick Actions</h4>
					<div class="space-y-2">
						<ButtonRoot
							variant="outline"
							size="sm"
							class="w-full justify-start"
							onclick={() => startEditing(currentSlide)}
						>
							✏️ Edit Current Slide
						</ButtonRoot>
						<ButtonRoot variant="outline" size="sm" class="w-full justify-start" onclick={addSlide}>
							➕ Add New Slide
						</ButtonRoot>
					</div>
				</div>
			</div>
		</div>
	</DialogRoot.Content>
</DialogRoot>

<!-- Edit Dialog -->
{#if isEditing}
	<DialogRoot bind:open={isEditing}>
		<DialogRoot.Content class="max-w-2xl">
			<div class="border-b p-6">
				<DialogRoot.Title class="text-xl font-semibold">Edit Slide</DialogRoot.Title>
			</div>

			<div class="space-y-4">
				<div>
					<label for="edit-title" class="mb-1 block text-sm font-medium text-gray-700">Title</label>
					<input
						id="edit-title"
						bind:value={editTitle}
						placeholder="Slide title"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					/>
				</div>

				<div>
					<Label for="edit-content">Content (HTML)</Label>
					<Textarea
						id="edit-content"
						bind:value={editContent}
						placeholder="Slide content (HTML allowed)"
						rows={6}
					/>
				</div>

				<div>
					<Label for="edit-notes">Presenter Notes</Label>
					<Textarea
						id="edit-notes"
						bind:value={editNotes}
						placeholder="Notes for presenter"
						rows={4}
					/>
				</div>
			</div>

			<div class="flex justify-end gap-3 border-t p-6">
				<ButtonRoot variant="outline" onclick={cancelEdit}>Cancel</ButtonRoot>
				<ButtonRoot onclick={saveEdit}>Save Changes</ButtonRoot>
			</div>
		</DialogRoot.Content>
	</DialogRoot>
{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-clamp: 2;
	}
</style>
