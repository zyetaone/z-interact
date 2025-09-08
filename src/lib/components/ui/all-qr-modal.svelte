<script lang="ts">
	import BaseQRModal from './base-qr-modal.svelte';
	import QRCodeGenerator from './qr-code-generator.svelte';
	import { printMultipleQRs, extractQRImageSrc } from '$lib/utils/qr-print';
	import { copyToClipboard } from '$lib/utils/index';
	import type { Table } from '$lib/types';

	let { open = $bindable(false), tables, personas, baseUrl } = $props();

	function handlePrintAll() {
		// Wait a moment for QR codes to be fully rendered
		setTimeout(() => {
			const qrData = tables
				.map((table: Table, index: number) => {
					const url = `${baseUrl}/table/${table.id}`;
					const imageSrc = extractQRImageSrc(`.all-qr-modal .qr-item-${index}`);

					if (!imageSrc) {
						return null;
					}

					return {
						title: table.displayName,
						url,
						imageSrc
					};
				})
				.filter(Boolean) as { title: string; url: string; imageSrc: string }[];

			if (qrData.length === 0) {
				return;
			}

			printMultipleQRs(qrData, {
				pageTitle: 'Table QR Codes - Scan to Join',
				gridColumns: 2,
				showPersona: true
			});
		}, 100);
	}

	async function copyAllUrls() {
		const urls = tables.map((table: Table) => `${baseUrl}/table/${table.id}`).join('\n');
		await copyToClipboard(urls, 'All table URLs copied to clipboard!');
	}
</script>

<BaseQRModal
	bind:open
	title="All Table QR Codes"
	size="xl"
	onPrint={handlePrintAll}
	onCopy={copyAllUrls}
	copyMessage="All table URLs copied to clipboard!"
	showDefaultHeader={false}
>
	{#snippet children()}
		<!-- Header description -->
		<p class="text-center text-gray-600 dark:text-gray-300">
			All table QR codes for the workspace design session
		</p>

		<!-- QR Codes Grid -->
		<div
			class="all-qr-modal grid max-h-96 grid-cols-1 gap-6 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3"
		>
			{#each tables as table, index (table.id)}
				{@const url = `${baseUrl}/table/${table.id}`}
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
							<QRCodeGenerator {url} size={120} />
						</div>
					</div>

					<!-- URL -->
					<div class="text-center">
						<code class="text-xs break-all text-gray-500 dark:text-gray-400">
							{url}
						</code>
					</div>
				</div>
			{/each}
		</div>

		<!-- Instructions -->
		<div class="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-900/20">
			<p class="text-sm text-blue-800 dark:text-blue-300">
				💡 <strong>Tip:</strong> Print all QR codes for easy distribution or copy all URLs to share digitally.
			</p>
		</div>
	{/snippet}
</BaseQRModal>
