<script lang="ts">
	import { Modal, Button } from 'flowbite-svelte';
	import QRCodeGenerator from './qr-code-generator.svelte';
	import { copyToClipboard } from '$lib/utils/index';
	import { printSingleQR, extractQRImageSrc } from '$lib/utils/qr-print';

	let {
		open = $bindable(false),
		title,
		size = 'lg' as 'lg' | 'xs' | 'sm' | 'md' | 'xl',
		children = undefined,
		url = undefined,
		onPrint = undefined,
		onCopy = undefined,
		copyMessage = 'Link copied to clipboard!',
		showDefaultHeader = true,
		enableDefaultPrint = false,
		printTitle = undefined
	} = $props();

	async function handleCopy() {
		if (onCopy) {
			await onCopy();
		} else if (url) {
			await copyToClipboard(url, copyMessage);
		}
	}

	function handlePrint() {
		if (onPrint) {
			onPrint();
		} else if (enableDefaultPrint && url) {
			const imageSrc = extractQRImageSrc('.qr-modal-content');
			if (!imageSrc) {
				return;
			}

			printSingleQR({
				title: printTitle || title,
				url,
				imageSrc
			});
		}
	}
</script>

<Modal bind:open {title} {size} outsideclose>
	<div class="space-y-6">
		<!-- Header description -->
		{#if showDefaultHeader}
			<p class="text-center text-gray-600 dark:text-gray-300">
				Scan the QR code or click the link to join
			</p>
		{/if}

		<!-- Content slot -->
		{#if children}
			{@render children()}
		{/if}

		<!-- QR Code Section (if URL provided) -->
		{#if url}
			<div class="flex flex-col items-center space-y-6">
				<div class="relative">
					<div
						class="qr-modal-content rounded-2xl border-4 border-gray-100 bg-white p-6 shadow-inner dark:border-gray-700 dark:bg-gray-800"
					>
						<QRCodeGenerator {url} size={250} />
					</div>
					<!-- QR Code Label -->
					<div class="absolute -bottom-3 left-1/2 -translate-x-1/2 transform">
						<div
							class="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white dark:bg-gray-700"
						>
							Scan me!
						</div>
					</div>
				</div>

				<!-- Direct Link Section -->
				<div class="w-full">
					<div
						class="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700"
					>
						<div
							class="border-b border-gray-200 bg-gray-100 px-4 py-2 dark:border-gray-500 dark:bg-gray-600"
						>
							<p
								class="text-xs font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300"
							>
								Or visit directly:
							</p>
						</div>
						<div class="p-4">
							<button onclick={() => window.open(url, '_blank')} class="group w-full text-left">
								<code
									class="text-sm font-medium break-all text-blue-600 transition-colors duration-200 group-hover:text-blue-800 dark:text-blue-400 dark:group-hover:text-blue-300"
								>
									{url}
								</code>
								<div
									class="mt-2 flex items-center text-xs text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300"
								>
									<svg class="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
										/>
									</svg>
									Click to open in new tab
								</div>
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<div class="flex w-full justify-center gap-3">
			{#if url || onCopy}
				<Button color="light" outline onclick={handleCopy} class="flex items-center gap-2">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
						/>
					</svg>
					Copy Link
				</Button>
			{/if}
			{#if onPrint}
				<Button color="light" outline onclick={handlePrint} class="flex items-center gap-2">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
						/>
					</svg>
					Print
				</Button>
			{/if}
			<Button onclick={() => (open = false)}>Close</Button>
		</div>
	{/snippet}
</Modal>
