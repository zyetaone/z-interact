<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button as ButtonRoot } from 'bits-ui';
	import Slide from './Slide.svelte';
	import PresenterDashboard from './PresenterDashboard.svelte';
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';

	let { slideData = [], currentSlide = $bindable(0) } = $props();

	let isDashboardOpen = $state(false);
	let qrCodes = $state<string[]>([]);
	let slideUrls = $state<string[]>([]);

	function nextSlide() {
		if (currentSlide < slideData.length - 1) {
			currentSlide++;
		}
	}

	function prevSlide() {
		if (currentSlide > 0) {
			currentSlide--;
		}
	}

	function handleSlideChange(newSlide: number) {
		currentSlide = newSlide;
	}

	// Generate unique URLs for each slide
	function generateSlideUrls() {
		const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
		slideUrls.length = 0;
		for (let i = 0; i < slideData.length; i++) {
			const slideUrl = `${baseUrl}/?slide=${i}`;
			slideUrls.push(slideUrl);
		}
	}

	// Generate QR codes for each slide
	async function generateQRCodes() {
		qrCodes.length = 0;
		for (const url of slideUrls) {
			try {
				const qrCodeDataUrl = await QRCode.toDataURL(url, {
					width: 200,
					margin: 2,
					color: {
						dark: '#FFFFFF',
						light: '#000000'
					}
				});
				qrCodes.push(qrCodeDataUrl);
			} catch (error) {
				console.error('Error generating QR code:', error);
				qrCodes.push('');
			}
		}
	}

	// Copy slide URL to clipboard
	async function copySlideUrl() {
		try {
			await navigator.clipboard.writeText(slideUrls[currentSlide]);
			// Could add a toast notification here
		} catch (error) {
			console.error('Failed to copy URL:', error);
		}
	}

	// Keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			prevSlide();
		} else if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === ' ') {
			event.preventDefault();
			nextSlide();
		} else if (event.key === 'Home') {
			event.preventDefault();
			currentSlide = 0;
		} else if (event.key === 'End') {
			event.preventDefault();
			currentSlide = slideData.length - 1;
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		generateSlideUrls();
		generateQRCodes();
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	// Regenerate QR codes when slideData changes
	$effect(() => {
		if (slideData.length > 0) {
			generateSlideUrls();
			generateQRCodes();
		}
	});
</script>

<div class="presentation-container min-h-screen bg-gray-900 text-white">
	<!-- Slide Content -->
	<div class="slide-container relative flex flex-1 items-center justify-center p-8">
		<div class="slide-content w-full max-w-4xl">
			{#if slideData[currentSlide]}
				<Slide title={slideData[currentSlide].title}>
					{@html slideData[currentSlide].content}
				</Slide>
			{/if}
		</div>

		<!-- QR Code Display - Desktop -->
		{#if qrCodes[currentSlide]}
			<div
				class="qr-code-container absolute top-4 right-4 hidden rounded-lg border border-white/30 bg-black/90 p-4 shadow-lg md:block"
			>
				<div class="mb-2 text-center text-sm font-medium text-white/80">Scan to join</div>
				<img
					src={qrCodes[currentSlide]}
					alt="QR Code for slide {currentSlide + 1}"
					class="mx-auto block h-32 w-32"
				/>
				<div class="mt-2 text-center text-xs text-white/60">
					Slide {currentSlide + 1}
				</div>
				<ButtonRoot
					variant="outline"
					size="sm"
					onclick={copySlideUrl}
					class="mt-2 w-full border-white/30 bg-white/10 text-xs text-white hover:bg-white/20"
				>
					📋 Copy URL
				</ButtonRoot>
			</div>

			<!-- QR Code Display - Mobile -->
			<div
				class="qr-code-container-mobile fixed bottom-20 left-1/2 -translate-x-1/2 transform rounded-lg border border-white/30 bg-black/90 p-3 shadow-lg md:hidden"
			>
				<div class="mb-1 text-center text-xs font-medium text-white/80">Scan to join</div>
				<img
					src={qrCodes[currentSlide]}
					alt="QR Code for slide {currentSlide + 1}"
					class="mx-auto block h-20 w-20"
				/>
				<div class="mt-1 text-center text-xs text-white/60">
					Slide {currentSlide + 1}
				</div>
			</div>
		{/if}
	</div>

	<!-- Navigation -->
	<div class="navigation fixed bottom-8 left-1/2 flex -translate-x-1/2 transform gap-4">
		<ButtonRoot
			variant="outline"
			size="lg"
			onclick={prevSlide}
			disabled={currentSlide === 0}
			class={cn(
				'border-white/20 bg-white/10 text-white hover:bg-white/20',
				currentSlide === 0 && 'cursor-not-allowed opacity-50'
			)}
		>
			Previous
		</ButtonRoot>

		<div class="flex items-center gap-2 text-white/70">
			{currentSlide + 1} / {slideData.length}
		</div>

		<ButtonRoot
			variant="outline"
			size="lg"
			onclick={nextSlide}
			disabled={currentSlide === slideData.length - 1}
			class={cn(
				'border-white/20 bg-white/10 text-white hover:bg-white/20',
				currentSlide === slideData.length - 1 && 'cursor-not-allowed opacity-50'
			)}
		>
			Next
		</ButtonRoot>

		<ButtonRoot
			variant="outline"
			size="lg"
			onclick={() => (isDashboardOpen = true)}
			class="ml-4 border-white/20 bg-white/10 text-white hover:bg-white/20"
		>
			📊 Dashboard
		</ButtonRoot>
	</div>

	<!-- Presenter Dashboard -->
	<PresenterDashboard
		bind:slideData
		bind:currentSlide
		bind:isDashboardOpen
		onSlideChange={handleSlideChange}
	/>
</div>

<style>
	.presentation-container {
		display: flex;
		flex-direction: column;
	}

	.slide-container {
		padding: 2rem;
	}

	.navigation {
		z-index: 10;
	}
</style>
