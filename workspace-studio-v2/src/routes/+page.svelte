<script lang="ts">
	import { PenTool, Globe, Film, ArrowRight, Presentation } from '@lucide/svelte';
</script>

<svelte:head>
	<title>ZyetaDX Studio</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<!-- Header -->
	<header class="pointer-events-none fixed top-0 right-0 left-0 z-30 flex justify-center px-6 pt-6">
		<div
			class="glass pointer-events-auto inline-flex items-center gap-2 rounded-full px-5 py-2.5"
		>
			<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20">
				<svg
					class="h-3.5 w-3.5 text-purple-300"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
					/>
				</svg>
			</div>
			<span class="text-sm font-semibold">
				<span class="text-purple-400">Zyeta</span><span class="text-white">DX</span>
				<span class="ml-1 text-xs font-normal text-slate-400">Studio</span>
			</span>
		</div>
	</header>

	<!-- Section 1: Edit Engine -->
	<section class="fade-in relative flex min-h-[50vh] items-center overflow-hidden">
		<!-- Background -->
		<div class="absolute inset-0 -z-10">
			<div
				class="absolute inset-0 scale-110 opacity-20 blur-2xl saturate-50"
				style="background-image: url('/assets/WS 01.jpg'); background-size: cover; background-position: center;"
			></div>
			<div class="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent">
			</div>
		</div>

		<!-- Content -->
		<div class="relative z-10 mx-auto max-w-2xl px-6 text-center">
			<div class="mb-6 inline-flex items-center justify-center rounded-2xl bg-purple-500/20 p-4">
				<PenTool class="h-8 w-8 text-purple-300" />
			</div>
			<h2 class="mb-4 text-4xl font-bold sm:text-5xl">Edit Engine</h2>
			<p class="mb-6 text-lg text-slate-400">
				Transform any image with AI-powered editing tools
			</p>
			<div class="mb-8 flex flex-wrap justify-center gap-2">
				{#each ['AI Inpainting', 'Mask Painting', 'Version Tree', 'Before / After'] as feature}
					<span
						class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400"
					>
						{feature}
					</span>
				{/each}
			</div>
			<a
				href="/editor"
				class="glass smooth-transition inline-flex items-center gap-2 rounded-2xl border border-purple-500/30 bg-purple-500/10 px-8 py-3 text-lg font-semibold text-purple-200 hover:scale-105 hover:bg-purple-500/20"
			>
				Open Editor
				<ArrowRight class="h-5 w-5" />
			</a>
		</div>
	</section>

	<!-- Divider -->
	<div class="mx-auto my-0 h-px w-24 bg-white/10"></div>

	<!-- Section 2: 3D World -->
	<section class="slide-up relative flex min-h-[50vh] items-center overflow-hidden">
		<!-- Background -->
		<div class="absolute inset-0 -z-10">
			<div
				class="absolute inset-0"
				style="background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 60px 60px;"
			></div>
			<div class="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/80 to-slate-950">
			</div>
		</div>

		<!-- Content -->
		<div class="relative z-10 mx-auto max-w-2xl px-6 text-center">
			<div class="mb-6 inline-flex items-center justify-center rounded-2xl bg-emerald-500/20 p-4">
				<Globe class="h-8 w-8 text-emerald-300" />
			</div>
			<h2 class="mb-4 text-4xl font-bold sm:text-5xl">3D World</h2>
			<p class="mb-6 text-lg text-slate-400">
				Explore workspace designs in an isometric universe
			</p>
			<div class="mb-8 flex flex-wrap justify-center gap-2">
				{#each ['Isometric Scene', 'Room Explorer', 'Avatar Walk', '3D Generation'] as feature}
					<span
						class="rounded-full border border-emerald-500/10 bg-white/5 px-3 py-1 text-xs text-slate-400"
					>
						{feature}
					</span>
				{/each}
			</div>
			<a
				href="/world"
				class="glass smooth-transition inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-8 py-3 text-lg font-semibold text-emerald-200 hover:scale-105 hover:bg-emerald-500/20"
			>
				Enter World
				<ArrowRight class="h-5 w-5" />
			</a>
		</div>
	</section>

	<!-- Divider -->
	<div class="mx-auto my-0 h-px w-24 bg-white/10"></div>

	<!-- Section 3: Video Engine -->
	<section class="fade-in relative flex min-h-[50vh] items-center overflow-hidden">
		<!-- Background -->
		<div class="absolute inset-0 -z-10">
			<div
				class="absolute inset-0 opacity-20 blur-2xl saturate-50"
				style="background: radial-gradient(ellipse at 30% 50%, rgba(245, 158, 11, 0.3), transparent 70%), radial-gradient(ellipse at 70% 50%, rgba(249, 115, 22, 0.2), transparent 70%);"
			></div>
			<div class="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/80 to-slate-950">
			</div>
		</div>

		<!-- Content -->
		<div class="relative z-10 mx-auto max-w-2xl px-6 text-center">
			<div class="mb-6 inline-flex items-center justify-center rounded-2xl bg-amber-500/20 p-4">
				<Film class="h-8 w-8 text-amber-300" />
			</div>
			<h2 class="mb-4 text-4xl font-bold sm:text-5xl">Video Engine</h2>
			<p class="mb-6 text-lg text-slate-400">
				Turn any images into cinematic video clips
			</p>
			<div class="mb-8 flex flex-wrap justify-center gap-2">
				{#each ['Image to Video', 'Camera Moves', 'Film Reel', 'Instant Download'] as feature}
					<span
						class="rounded-full border border-amber-500/10 bg-white/5 px-3 py-1 text-xs text-slate-400"
					>
						{feature}
					</span>
				{/each}
			</div>
			<a
				href="/video"
				class="glass smooth-transition inline-flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-8 py-3 text-lg font-semibold text-amber-200 hover:scale-105 hover:bg-amber-500/20"
			>
				Create Film
				<ArrowRight class="h-5 w-5" />
			</a>
		</div>
	</section>

	<!-- Workshop Mode -->
	<div class="flex items-center justify-center py-12">
		<a
			href="/workshop"
			class="glass smooth-transition inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm text-slate-400 hover:border-white/20 hover:text-white"
		>
			<Presentation class="h-4 w-4" />
			Workshop Mode
			<ArrowRight class="h-4 w-4" />
		</a>
	</div>
</div>
