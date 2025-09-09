<script lang="ts">
	import { Modal, Button } from 'flowbite-svelte';
	import QRCodeGenerator from './qr-code-generator.svelte';
	import { copyToClipboard } from '$lib/utils/index';
	import { printSingleQR, printMultipleQRs, extractQRImageSrc } from '$lib/utils/qr-print';
	import { LightbulbOutline } from 'flowbite-svelte-icons';
	import type { Table } from '$lib/types';

	interface SingleModeProps {
		tableNumber: number;
		url: string;
		tables?: never;
		personas?: never;
		baseUrl?: never;
	}

	interface MultiModeProps {
		tables: Table[];
		personas: Record<string, { title: string }>;
		baseUrl: string;
		tableNumber?: never;
		url?: never;
	}

	type QRModalProps = {
		open: boolean;
		size?: 'lg' | 'xs' | 'sm' | 'md' | 'xl';
	} & (SingleModeProps | MultiModeProps);

	let {
		open = $bindable(false),
		size = 'lg',
		tableNumber,
		url,
		tables,
		personas,
		baseUrl
	}: QRModalProps = $props();

	// Determine mode based on props - single mode has url and tableNumber
	const isMultiMode = $derived(Boolean(tables && personas && baseUrl));
	const isSingleMode = $derived(Boolean(url && tableNumber));

	// Dynamic title based on mode
	const title = $derived(
		isMultiMode ? 'All Table QR Codes' : isSingleMode ? `Table ${tableNumber}` : 'QR Code'
	);

	// Dynamic modal size - larger for multiple QRs
	const modalSize = $derived(isMultiMode ? 'xl' : size);

	async function handleCopy() {
		if (isMultiMode && tables && baseUrl) {
			const urls = tables.map((table: Table) => `${baseUrl}/table/${table.id}`).join('\n');
			await copyToClipboard(urls, 'All table URLs copied to clipboard!');
		} else if (isSingleMode && url) {
			await copyToClipboard(url, 'Link copied to clipboard!');
		}
	}

	function handlePrint() {
		if (isMultiMode && tables && baseUrl) {
			// Wait for QR codes to render
			setTimeout(() => {
				const qrData = tables
					.map((table: Table, index: number) => {
						const tableUrl = `${baseUrl}/table/${table.id}`;
						const imageSrc = extractQRImageSrc(`.qr-modal-container .qr-item-${index}`);

						if (!imageSrc) return null;

						return {
							title: table.displayName,
							url: tableUrl,
							imageSrc
						};
					})
					.filter(Boolean) as { title: string; url: string; imageSrc: string }[];

				if (qrData.length === 0) return;

				printMultipleQRs(qrData, {
					pageTitle: 'Table QR Codes - Scan to Join',
					gridColumns: 2,
					showPersona: true
				});
			}, 100);
		} else if (isSingleMode && url && tableNumber) {
			const imageSrc = extractQRImageSrc('.qr-modal-container');
			if (!imageSrc) return;

			printSingleQR({
				title: `Table ${tableNumber}`,
				url,
				imageSrc
			});
		}
	}
</script>

<Modal bind:open {title} size={modalSize} outsideclose>
	<div class="qr-modal-container space-y-6">
		<!-- Multi-mode: All table QR codes -->
		{#if isMultiMode && tables && personas && baseUrl}
			<p class="text-center text-gray-600 dark:text-gray-300">
				All table QR codes for the workspace design session
			</p>

			<div class="grid max-h-96 grid-cols-1 gap-6 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
				{#each tables as table, index (table.id)}
					{@const tableUrl = `${baseUrl}/table/${table.id}`}
					{@const persona = personas[table.personaId]}

					<div
						class="qr-item-{index} flex flex-col items-center space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-700"
					>
						<!-- Table Info -->
						<div class="text-center">
							<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
								{table.displayName}
							</h3>
							<p class="text-sm text-gray-600 dark:text-gray-300">
								{persona?.title || 'Unknown Persona'}
							</p>
						</div>

						<!-- QR Code -->
						<div class="relative">
							<div
								class="rounded-xl border-2 border-gray-200 bg-white p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800"
							>
								<QRCodeGenerator url={tableUrl} size={120} />
							</div>
						</div>

						<!-- URL -->
						<div class="text-center">
							<code class="text-xs break-all text-gray-500 dark:text-gray-400">
								{tableUrl}
							</code>
						</div>
					</div>
				{/each}
			</div>

			<!-- Instructions for multi-mode -->
			<div class="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-900/20">
				<p class="text-sm text-blue-800 dark:text-blue-300">
					<LightbulbOutline class="mr-1 inline h-4 w-4" />
					<strong>Tip:</strong> Print all QR codes for easy distribution or copy all URLs to share digitally.
				</p>
			</div>

			<!-- Single-mode: Individual table QR code -->
		{:else if isSingleMode && url && tableNumber}
			<p class="text-center text-gray-600 dark:text-gray-300">
				Scan the QR code or click the link to join
			</p>

			<div class="flex flex-col items-center space-y-6">
				<div class="relative">
					<div
						class="rounded-2xl border-4 border-gray-100 bg-white p-6 shadow-inner dark:border-gray-700 dark:bg-gray-800"
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
			{#if (isMultiMode && tables) || (isSingleMode && url)}
				<Button color="light" outline onclick={handleCopy} class="flex items-center gap-2">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
						/>
					</svg>
					{isMultiMode ? 'Copy All Links' : 'Copy Link'}
				</Button>
			{/if}

			{#if (isMultiMode && tables) || (isSingleMode && url)}
				<Button color="light" outline onclick={handlePrint} class="flex items-center gap-2">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
						/>
					</svg>
					{isMultiMode ? 'Print All' : 'Print'}
				</Button>
			{/if}

			<Button onclick={() => (open = false)}>Close</Button>
		</div>
	{/snippet}
</Modal>
