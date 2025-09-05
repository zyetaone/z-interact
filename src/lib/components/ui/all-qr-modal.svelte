<script lang="ts">
	import { Modal, Button } from 'flowbite-svelte';
	import QRCodeGenerator from './qr-code-generator.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Table, Persona } from '$lib/config.svelte';

	interface Props {
		open: boolean;
		tables: Table[];
		personas: Record<string, Persona>;
		baseUrl: string;
	}

	let { open = $bindable(false), tables, personas, baseUrl }: Props = $props();

	function handlePrintAll() {
		// Create a new window for printing all QR codes
		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			toastStore.error('Pop-up blocked. Please allow pop-ups and try again.');
			return;
		}

		// Generate HTML content for all QR codes
		let qrCodeSections = '';
		const qrImages = document.querySelectorAll('.all-qr-modal img');

		tables.forEach((table, index) => {
			const qrImg = qrImages[index] as HTMLImageElement;
			const url = `${baseUrl}/table/${table.id}`;
			// const persona = personas[table.personaId];

			if (qrImg) {
				qrCodeSections += `
					<div class="qr-section">
						<div class="qr-header">
							<div class="qr-title">${table.displayName}</div>
							<!-- <div class="qr-persona">${persona?.title || 'Unknown Persona'}</div> -->
							<div class="qr-url">${url}</div>
						</div>
						<img class="qr-image" src="${qrImg.src}" alt="QR Code for ${table.displayName}" />
					</div>
				`;
			}
		});

		// Write content to the new window
		printWindow.document.write(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>All Table QR Codes</title>
				<style>
					body {
						margin: 0;
						padding: 15mm;
						font-family: Arial, sans-serif;
						background: white;
						color: black;
					}
					.page-title {
						text-align: center;
						font-size: 28px;
						font-weight: bold;
						margin-bottom: 30px;
						border-bottom: 2px solid #333;
						padding-bottom: 10px;
					}
					.qr-grid {
						display: grid;
						grid-template-columns: repeat(2, 1fr);
						gap: 20mm;
						margin-top: 20px;
					}
					.qr-section {
						break-inside: avoid;
						display: flex;
						flex-direction: column;
						align-items: center;
						padding: 15mm;
						border: 2px solid #ddd;
						border-radius: 8px;
						page-break-inside: avoid;
					}
					.qr-header {
						text-align: center;
						margin-bottom: 15mm;
					}
					.qr-title {
						font-size: 24px;
						font-weight: bold;
						margin-bottom: 5mm;
						color: #333;
					}
					.qr-persona {
						font-size: 16px;
						color: #666;
						margin-bottom: 5mm;
						font-style: italic;
					}
					.qr-url {
						font-size: 12px;
						color: #888;
						word-break: break-all;
						max-width: 50mm;
						line-height: 1.3;
					}
					.qr-image {
						display: block;
						width: 40mm;
						height: 40mm;
						border-radius: 4mm;
						border: 1px solid #ddd;
					}
					@media print {
						body { margin: 0; padding: 10mm; }
						@page { 
							margin: 10mm; 
							size: A4; 
						}
						.qr-section {
							page-break-inside: avoid;
						}
					}
				</style>
			</head>
			<body>
				<div class="page-title">Table QR Codes - Scan to Join</div>
				<div class="qr-grid">
					${qrCodeSections}
				</div>
			</body>
			</html>
		`);

		printWindow.document.close();

		// Wait for content to load, then print and close
		printWindow.onload = () => {
			setTimeout(() => {
				printWindow.print();
				printWindow.close();
				toastStore.success('QR codes sent to printer');
			}, 500);
		};
	}

	async function copyAllUrls() {
		const urls = tables.map((table) => `${baseUrl}/table/${table.id}`).join('\n');
		try {
			await navigator.clipboard.writeText(urls);
			toastStore.success('All table URLs copied to clipboard!');
		} catch (error) {
			toastStore.error('Failed to copy URLs');
		}
	}
</script>

<Modal bind:open title="All Table QR Codes" size="xl" outsideclose>
	<div class="space-y-6">
		<!-- Header description -->
		<p class="text-center text-gray-600 dark:text-gray-300">
			All table QR codes for the workspace design session
		</p>

		<!-- QR Codes Grid -->
		<div
			class="all-qr-modal grid max-h-96 grid-cols-1 gap-6 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3"
		>
			{#each tables as table}
				{@const url = `${baseUrl}/table/${table.id}`}
				{@const persona = personas[table.personaId]}

				<div
					class="flex flex-col items-center space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-700"
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
	</div>

	{#snippet footer()}
		<div class="flex w-full justify-center gap-3">
			<Button color="light" outline onclick={copyAllUrls} class="flex items-center gap-2">
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
					/>
				</svg>
				Copy All URLs
			</Button>
			<Button color="light" outline onclick={handlePrintAll} class="flex items-center gap-2">
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
					/>
				</svg>
				Print All QR Codes
			</Button>
			<Button onclick={() => (open = false)}>Close</Button>
		</div>
	{/snippet}
</Modal>
