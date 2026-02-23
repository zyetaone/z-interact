<script lang="ts">
	import { Workspace } from '../table/[tableId]/workspace.svelte.ts';
	import { Editor } from '$lib/editor.svelte';
	import { Viewer } from '../table/[tableId]/viewer.svelte.ts';
	import VersionTree from '$lib/components/VersionTree.svelte';
	import EditorBar from '$lib/components/EditorBar.svelte';
	import CommandBar from '$lib/components/CommandBar.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import LayerBar from '$lib/components/LayerBar.svelte';
	import { maskCanvas } from '$lib/actions/mask-canvas.svelte';
	import {
		PanelRightClose,
		PanelRightOpen,
		RotateCcw,
		Square,
		Paintbrush,
		Wand2,
		ChevronsLeftRight,
		Camera,
		ImageIcon,
		Sparkles,
		Pentagon
	} from '@lucide/svelte';
	import { base } from '$app/paths';
	import { generateMaskFromShapes } from '$lib/utils/mask';
	import { segmentObject } from '../table/ai.remote';

	let { data } = $props();

	let workspace = $state(new Workspace(data, '/editor'));
	let editor = $state(new Editor());
	let viewer = $state(new Viewer());
	let autoLoadTriggered = $state(false);
	let commandBarRef: ReturnType<typeof CommandBar> | undefined = $state();
	let errorTimer: ReturnType<typeof setTimeout> | undefined;
	let magicClickPos = $state<{ x: number; y: number } | null>(null);

	// Auto-dismiss error messages after 5 seconds
	$effect(() => {
		if (workspace.errorMessage) {
			clearTimeout(errorTimer);
			errorTimer = setTimeout(() => (workspace.errorMessage = ''), 5000);
		}
		return () => clearTimeout(errorTimer);
	});

	// Setup mobile media query
	$effect(() => {
		return viewer.setupMediaQuery();
	});

	// Auto-load random preset image
	$effect(() => {
		if (workspace.status === 'upload' && data.assetImages.length > 0 && !autoLoadTriggered) {
			autoLoadTriggered = true;
			const randomIndex = Math.floor(Math.random() * data.assetImages.length);
			workspace.createWorkspace(data.assetImages[randomIndex]);
		}
	});

	$effect(() => {
		if (data.tableId !== workspace.data.tableId) {
			workspace = new Workspace(data, '/editor');
			editor = new Editor();
			viewer.reset();
			autoLoadTriggered = false;
		}
	});

	function handleReset() {
		if (confirm('Are you sure you want to start fresh? All edits will be lost.')) {
			workspace = new Workspace({ ...data, history: [], workspace: null }, '/editor');
			editor = new Editor();
			viewer.reset();
			autoLoadTriggered = false;
		}
	}

	async function handleChangeImage() {
		workspace = new Workspace({ ...data, history: [], workspace: null }, '/editor');
		editor = new Editor();
		viewer.reset();
		autoLoadTriggered = false;
		// Auto-load a different random preset
		if (data.assetImages.length > 0) {
			autoLoadTriggered = true;
			const randomIndex = Math.floor(Math.random() * data.assetImages.length);
			try {
				await workspace.createWorkspace(data.assetImages[randomIndex]);
			} catch (e) {
				workspace.errorMessage = e instanceof Error ? e.message : 'Failed to change image';
			}
		}
	}

	async function handleUpload(file: File) {
		const formData = new FormData();
		formData.append('image', file);

		try {
			const res = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});
			if (!res.ok) throw new Error('Upload failed');

			const { url } = await res.json();
			await workspace.createWorkspace(url);
		} catch (e) {
			workspace.errorMessage = e instanceof Error ? e.message : 'Upload failed';
		}
	}

	async function handleAssetUpload(file: File) {
		const formData = new FormData();
		formData.append('image', file);

		try {
			const res = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});
			if (!res.ok) throw new Error('Asset upload failed');

			const { url } = await res.json();
			editor.assetUrl = url;
		} catch (e) {
			workspace.errorMessage = e instanceof Error ? e.message : 'Asset upload failed';
		}
	}

	async function handleGenerate() {
		if (!editor.canGenerate) return;

		let maskData = editor.maskData;
		if (maskData && viewer.imgRef) {
			const maskUrl = generateMaskFromShapes(
				editor.rects,
				editor.paths,
				editor.polygons,
				viewer.naturalWidth,
				viewer.naturalHeight,
				viewer.renderedFrame
			);
			if (maskUrl) {
				maskData = { ...maskData, aiMaskUrl: maskUrl };
			}
		}

		await workspace.generate(editor.prompt, maskData, editor.mode, editor.strength);
		// Sticky masks: only clear prompt, keep mask for rapid iteration
		editor.prompt = '';
	}

	async function handleMagicClick(x: number, y: number) {
		if (workspace.isProcessing) return;

		// Show ripple at click position (convert natural coords to rendered coords)
		const frame = viewer.renderedFrame;
		if (frame.scale > 0) {
			magicClickPos = {
				x: frame.x + x / frame.scale,
				y: frame.y + y / frame.scale
			};
		}

		workspace.isProcessing = true;
		try {
			const { maskUrl } = await segmentObject({
				imageUrl: workspace.currentImageUrl,
				points: [[x, y]]
			});
			editor.aiMaskUrl = maskUrl;
		} catch (e) {
			workspace.errorMessage = e instanceof Error ? e.message : 'Magic wand failed';
		} finally {
			workspace.isProcessing = false;
			magicClickPos = null;
		}
	}

	// Comparison Slider Handlers
	function handleSliderMove(e: MouseEvent | TouchEvent) {
		if (!viewer.isDraggingCompare || !viewer.imgRef) return;
		const rect = viewer.imgRef.parentElement?.getBoundingClientRect();
		if (!rect) return;

		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const x = clientX - rect.left;
		const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
		viewer.compareSlider = percent;
	}

	function handleSliderEnd() {
		viewer.isDraggingCompare = false;
	}
</script>

<div class="min-h-screen bg-slate-950 text-slate-200">
	<!-- Header -->
	<header class="border-b border-white/5 px-4 py-3 md:px-6 md:py-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3 md:gap-4">
				<a
					href="/"
					class="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
					aria-label="Back to Dashboard"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</a>
				<h1 class="text-lg font-semibold md:text-xl">Edit Engine</h1>
				{#if workspace.editCount > 0}
					<span class="hidden text-sm text-slate-400 sm:inline">
						{workspace.editCount} edits
					</span>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				{#if workspace.status !== 'upload'}
					<button
						onclick={handleChangeImage}
						class="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
						title="Change Image"
					>
						<ImageIcon class="h-4 w-4" />
						<span class="hidden sm:inline">Change Image</span>
					</button>
					<button
						onclick={handleReset}
						class="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
						title="Start Fresh"
					>
						<RotateCcw class="h-4 w-4" />
						<span class="hidden sm:inline">Reset</span>
					</button>
				{/if}

				<!-- Sidebar toggle: desktop only -->
				<button
					onclick={() => (viewer.isSidebarOpen = !viewer.isSidebarOpen)}
					class="hidden h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white md:flex"
					title={viewer.isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
					aria-label={viewer.isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
				>
					{#if viewer.isSidebarOpen}
						<PanelRightClose class="h-4 w-4" />
					{:else}
						<PanelRightOpen class="h-4 w-4" />
					{/if}
				</button>
			</div>
		</div>
	</header>

	<main class="flex h-[calc(100vh-57px)] md:h-[calc(100vh-72px)]">
		<!-- Canvas area -->
		<div
			class="flex flex-1 flex-col p-0 md:p-6 {viewer.isMobile && workspace.status !== 'upload'
				? 'pb-[220px]'
				: ''}"
		>
			{#if workspace.status === 'upload'}
				<!-- Upload zone -->
				<div
					role="region"
					aria-label="Upload Drop Zone"
					class="flex h-full flex-col items-center justify-center rounded-none border-2 border-dashed p-8 transition-colors md:rounded-2xl md:p-12 {viewer.isDragging
						? 'border-purple-500'
						: 'border-white/10'} bg-white/5"
					ondragover={(e) => {
						e.preventDefault();
						viewer.isDragging = true;
					}}
					ondragleave={() => (viewer.isDragging = false)}
					ondrop={(e) => {
						e.preventDefault();
						viewer.isDragging = false;
						const file = e.dataTransfer?.files[0];
						if (file?.type.startsWith('image/')) handleUpload(file);
					}}
				>
					<!-- Workflow stepper -->
					<div class="mb-6 flex items-center justify-center gap-2">
						<div class="flex flex-col items-center gap-1">
							<div class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">1</div>
							<span class="text-[10px] text-slate-400">Upload</span>
						</div>
						<div class="h-px w-6 bg-white/10"></div>
						<div class="flex flex-col items-center gap-1">
							<div class="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-slate-500">2</div>
							<span class="text-[10px] text-slate-400">Edit</span>
						</div>
					</div>

					<p class="mb-4 hidden text-lg md:block">Drop an image here</p>
					<p class="hidden text-sm text-slate-500 md:block">or</p>
					<label
						class="mt-0 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-base hover:bg-purple-500 md:mt-4 md:py-2"
					>
						<Camera class="h-5 w-5 md:hidden" />
						<span class="md:hidden">Take or Choose Photo</span>
						<span class="hidden md:inline">Choose File</span>
						<input
							type="file"
							accept="image/*"
							capture="environment"
							class="hidden"
							onchange={(e) => {
								const file = e.currentTarget.files?.[0];
								if (file) handleUpload(file);
							}}
						/>
					</label>
					<p class="mt-3 text-center text-xs text-slate-500">Start with any office or workspace photo</p>
				</div>
			{:else}
				<!-- Canvas + CommandBar stacked -->
				<div class="relative flex-1 overflow-hidden rounded-none bg-black md:rounded-xl">
					<img
						bind:this={viewer.imgRef}
						bind:clientWidth={viewer.imgWidth}
						bind:clientHeight={viewer.imgHeight}
						bind:naturalWidth={viewer.natWidth}
						bind:naturalHeight={viewer.natHeight}
						src={workspace.currentImageUrl}
						alt="Current"
						class="h-full w-full object-contain"
					/>

					{#if viewer.imgRef && workspace.status !== 'locked'}
						<canvas
							class="absolute inset-0 z-10 h-full w-full touch-none {editor.maskTool === 'magic'
								? 'cursor-cell'
								: 'cursor-crosshair'}"
							width={viewer.canvasWidth}
							height={viewer.canvasHeight}
							use:maskCanvas={() => ({
								editor,
								width: viewer.canvasWidth,
								height: viewer.canvasHeight,
								naturalWidth: viewer.naturalWidth,
								naturalHeight: viewer.naturalHeight,
								renderedFrame: viewer.renderedFrame,
								onMagicClick: handleMagicClick
							})}
						></canvas>
					{/if}

					<!-- Processing overlay -->
					{#if workspace.isProcessing}
						<div class="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
							<div class="flex flex-col items-center gap-3">
								<div class="relative h-14 w-14">
									<div class="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
									<div class="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-purple-500" style="animation-duration: 1.2s"></div>
								</div>
								<p class="text-sm font-medium text-white/90">Generating...</p>
							</div>
						</div>
					{/if}

					<!-- Magic wand click feedback -->
					{#if magicClickPos}
						<div
							class="pointer-events-none absolute z-20"
							style="left: {magicClickPos.x}px; top: {magicClickPos.y}px; transform: translate(-50%, -50%)"
						>
							<div class="h-12 w-12 animate-ping rounded-full bg-purple-500/40"></div>
							<span class="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[10px] text-white backdrop-blur">
								Detecting object...
							</span>
						</div>
					{/if}

					<!-- Sparkle focus button: desktop only, when mask is active -->
					{#if editor.hasMask && !workspace.isComparing && !viewer.isMobile}
						<button
							class="absolute right-3 bottom-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-purple-500/30 bg-slate-900/80 text-purple-300 shadow-lg backdrop-blur-md transition-all hover:bg-purple-500/20 hover:text-purple-200"
							onclick={() => commandBarRef?.focus()}
							title="Describe your edit"
						>
							<Sparkles class="h-5 w-5" />
						</button>
					{/if}

					<!-- Floating Tool Selector -->
				{#if workspace.status !== 'locked'}
					<div
						class="absolute top-3 left-3 z-20 flex items-center gap-1 rounded-lg border border-white/10 bg-black/60 p-1 backdrop-blur-md md:top-4 md:left-4"
					>
						<button
							onclick={() => (editor.maskTool = 'draw')}
							class="flex h-11 w-11 items-center justify-center rounded-md transition-colors md:h-8 md:w-8 {editor.maskTool ===
							'draw'
								? 'bg-purple-500/30 text-purple-300'
								: 'text-slate-400 hover:bg-white/10 hover:text-white'}"
							title="Rectangle Select"
							aria-label="Rectangle Select"
						>
							<Square class="h-5 w-5 md:h-4 md:w-4" />
						</button>
						<button
							onclick={() => (editor.maskTool = 'brush')}
							class="flex h-11 w-11 items-center justify-center rounded-md transition-colors md:h-8 md:w-8 {editor.maskTool ===
							'brush'
								? 'bg-purple-500/30 text-purple-300'
								: 'text-slate-400 hover:bg-white/10 hover:text-white'}"
							title="Brush Tool"
							aria-label="Brush Tool"
						>
							<Paintbrush class="h-5 w-5 md:h-4 md:w-4" />
						</button>
						<button
							onclick={() => (editor.maskTool = 'poly')}
							class="flex h-11 w-11 items-center justify-center rounded-md transition-colors md:h-8 md:w-8 {editor.maskTool ===
							'poly'
								? 'bg-purple-500/30 text-purple-300'
								: 'text-slate-400 hover:bg-white/10 hover:text-white'}"
							title="Polygon Tool"
							aria-label="Polygon Tool"
						>
							<Pentagon class="h-5 w-5 md:h-4 md:w-4" />
						</button>
						<button
							onclick={() => (editor.maskTool = 'magic')}
							class="flex h-11 w-11 items-center justify-center rounded-md transition-colors md:h-8 md:w-8 {editor.maskTool ===
							'magic'
								? 'bg-purple-500/30 text-purple-300'
								: 'text-slate-400 hover:bg-white/10 hover:text-white'}"
							title="Magic Wand (AI Select)"
							aria-label="Magic Wand"
						>
							<Wand2 class="h-5 w-5 md:h-4 md:w-4" />
						</button>

						<!-- Inline brush size slider -->
						{#if editor.maskTool === 'brush'}
							<div class="ml-1 flex items-center gap-1 border-l border-white/10 pl-2">
								<input
									type="range"
									min="5"
									max="100"
									bind:value={editor.brushSize}
									class="h-1 w-16 cursor-pointer appearance-none rounded-full bg-slate-700 accent-purple-500"
								/>
								<span class="w-5 text-center font-mono text-[10px] text-slate-400"
									>{editor.brushSize}</span
								>
							</div>
						{/if}
					</div>
				{/if}

					{#if workspace.isComparing}
						<!-- Comparison Image Overlay -->
						<div
							class="pointer-events-none absolute inset-0 z-20"
							style="clip-path: inset(0 {100 - viewer.compareSlider}% 0 0)"
						>
							<img
								src={workspace.compareImageUrl}
								alt="Compare"
								class="h-full w-full object-contain"
							/>
						</div>

						<!-- Before / After labels -->
						<div class="pointer-events-none absolute top-3 left-3 z-30 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white/80 backdrop-blur-sm">Before</div>
						<div class="pointer-events-none absolute top-3 right-3 z-30 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white/80 backdrop-blur-sm">After</div>

						<!-- Vertical Divider Line -->
						<div
							class="pointer-events-none absolute top-0 bottom-0 z-30 w-0.5 bg-white/50 backdrop-blur-sm"
							style="left: {viewer.compareSlider}%"
						></div>

						<!-- Draggable Handle -->
						<button
							class="absolute top-1/2 z-40 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-xl backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
							style="left: {viewer.compareSlider}%"
							onmousedown={() => (viewer.isDraggingCompare = true)}
							ontouchstart={() => (viewer.isDraggingCompare = true)}
							aria-label="Drag to compare"
						>
							<ChevronsLeftRight class="h-5 w-5" />
						</button>

						<!-- Global Drag Surface -->
						{#if viewer.isDraggingCompare}
							<div
								class="absolute inset-0 z-50 cursor-ew-resize"
								role="none"
								onmousemove={handleSliderMove}
								onmouseup={handleSliderEnd}
								onmouseleave={handleSliderEnd}
								ontouchmove={handleSliderMove}
								ontouchend={handleSliderEnd}
							></div>
						{/if}
					{/if}
				</div>

				<!-- Desktop CommandBar: anchored below canvas -->
				{#if !viewer.isMobile && workspace.status !== 'locked'}
					<div class="mt-3 hidden md:block">
						<CommandBar
							bind:this={commandBarRef}
							{editor}
							isProcessing={workspace.isProcessing}
							onsubmit={() => handleGenerate()}
							onassetupload={handleAssetUpload}
						/>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Desktop Sidebar -->
		{#if !viewer.isMobile}
			<aside
				class="glass-panel flex w-[340px] flex-col overflow-hidden rounded-2xl border-l border-white/5 bg-[#0f111a]/95 backdrop-blur-xl transition-all duration-300
				{viewer.isSidebarOpen
					? 'translate-x-0 opacity-100'
					: 'w-0 translate-x-full overflow-hidden opacity-0'}"
			>
				{#if workspace.status !== 'upload'}
					<div class="custom-scrollbar flex-1 overflow-y-auto p-4">
						<div class="flex flex-col gap-6">
							<EditorBar
								{editor}
								isProcessing={workspace.isProcessing}
							/>

							<div class="flex gap-2">
								<button
									onclick={() => workspace.toggleComparison()}
									class="flex-1 rounded-lg py-2 text-sm transition-colors {workspace.isComparing
										? 'bg-purple-600 text-white'
										: 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}"
								>
									{workspace.isComparing ? 'Comparing' : 'Compare'}
								</button>
							</div>

							<!-- Horizontal version strip -->
							{#if workspace.versions.length > 0}
								<div class="border-t border-white/5 pt-4">
									<div class="mb-2 flex items-center justify-between">
										<h3 class="text-sm font-medium text-slate-400">History</h3>
									</div>
									<div class="flex gap-2 overflow-x-auto pb-2">
										{#each workspace.versions as version (version.id)}
											<button
												onclick={() => workspace.activate(version.id)}
												class="flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all {version.id ===
												workspace.activeId
													? 'border-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
													: 'border-white/10 hover:scale-105 hover:border-white/20 hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]'}"
											>
												<img
													src={version.imageUrl}
													alt="Step {version.step}"
													class="h-14 w-14 object-cover"
												/>
											</button>
										{/each}
									</div>

									<!-- Full tree (expandable) -->
									<details class="mt-2">
										<summary
											class="cursor-pointer text-[10px] font-medium text-slate-500 hover:text-slate-300"
											>Show tree view</summary
										>
										<div class="mt-2">
											<VersionTree
												tree={workspace.tree}
												activeId={workspace.activeId}
												compareId={workspace.compareId}
												onselect={(id, e) => {
													if (e.altKey) {
														workspace.setCompareTarget(id);
													} else {
														workspace.activate(id);
													}
												}}
												ondelete={(id) => workspace.delete(id)}
											/>
										</div>
									</details>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</aside>
		{/if}
	</main>

	<!-- Mobile Bottom Sheet -->
	{#if viewer.isMobile && workspace.status !== 'upload' && workspace.status !== 'locked'}
		<BottomSheet bind:snap={viewer.sheetSnap}>
			{#snippet children()}
				<!-- Peek content: CommandBar -->
				<CommandBar
					{editor}
					isProcessing={workspace.isProcessing}
					onsubmit={() => handleGenerate()}
					onassetupload={handleAssetUpload}
				/>
			{/snippet}

			{#snippet fullContent()}
				<!-- Full sheet: CommandBar + PropertiesPanel + History -->
				<div class="flex flex-col gap-4">
					<CommandBar
						{editor}
						isProcessing={workspace.isProcessing}
						onsubmit={() => handleGenerate()}
						onassetupload={handleAssetUpload}
					/>

					<EditorBar
						{editor}
						isProcessing={workspace.isProcessing}
					/>

					<div class="flex gap-2">
						<button
							onclick={() => workspace.toggleComparison()}
							class="flex-1 rounded-lg py-2.5 text-sm transition-colors {workspace.isComparing
								? 'bg-purple-600 text-white'
								: 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}"
						>
							{workspace.isComparing ? 'Comparing' : 'Compare'}
						</button>
					</div>

					<!-- Horizontal version thumbnails -->
					{#if workspace.versions.length > 0}
						<div class="border-t border-white/5 pt-3">
							<h3 class="mb-2 text-xs font-medium text-slate-400">History</h3>
							<div class="flex gap-2 overflow-x-auto pb-2">
								{#each workspace.versions as version (version.id)}
									<button
										onclick={() => workspace.activate(version.id)}
										class="flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all {version.id ===
										workspace.activeId
											? 'border-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
											: 'border-white/10 hover:border-white/20'}"
									>
										<img
											src={version.imageUrl}
											alt="Step {version.step}"
											class="h-16 w-16 object-cover"
										/>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/snippet}
		</BottomSheet>
	{/if}

	{#if workspace.errorMessage}
		<div
			class="fixed bottom-6 left-1/2 z-[60] flex max-w-md -translate-x-1/2 items-center gap-3 overflow-hidden rounded-lg bg-rose-600 px-5 py-3 text-white shadow-lg animate-in"
		>
			<span class="text-sm">{workspace.errorMessage}</span>
			<button
				class="ml-auto flex-shrink-0 text-rose-200 hover:text-white"
				onclick={() => (workspace.errorMessage = '')}
			>
				&times;
			</button>
			<!-- Auto-dismiss progress bar -->
			<div class="absolute right-0 bottom-0 left-0 h-0.5 bg-rose-400/30">
				<div class="h-full bg-rose-300/60 animate-shrink"></div>
			</div>
		</div>
	{/if}

	<!-- Layer Navigation -->
	<LayerBar
		activeLayer="canvas"
		tableId={null}
		layers={{
			canvas: { available: true },
			world: { available: true },
			video: { available: false }
		}}
		class="fixed left-1/2 z-[55] -translate-x-1/2 {viewer.isMobile && workspace.status !== 'upload' && workspace.status !== 'locked' ? 'bottom-20' : 'bottom-6'}"
	/>
</div>
