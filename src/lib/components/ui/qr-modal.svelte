<script lang="ts">
	import { Modal, Button } from 'flowbite-svelte';
	import QRCodeGenerator from './qr-code-generator.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	interface Props {
		open: boolean;
		tableNumber: number;
		url: string;
	}

	let { open = $bindable(false), tableNumber, url }: Props = $props();

	function handlePrint() {
		// Find the QR code image element
		const qrImg = document.querySelector('.qr-modal-content img');
		if (!qrImg) {
			toastStore.error('QR code not found');
			return;
		}

		// Create a new window for printing
		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			toastStore.error('Pop-up blocked. Please allow pop-ups and try again.');
			return;
		}

		// Write content to the new window
		printWindow.document.write(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Table ${tableNumber} QR Code</title>
				<style>
					body {
						margin: 0;
						padding: 20px;
						display: flex;
						flex-direction: column;
						align-items: center;
						justify-content: center;
						min-height: 100vh;
						font-family: Arial, sans-serif;
						background: white;
					}
					.qr-header {
						text-align: center;
						margin-bottom: 20px;
					}
					.qr-title {
						font-size: 32px;
						font-weight: bold;
						margin-bottom: 10px;
						color: black;
					}
					.qr-url {
						font-size: 14px;
						color: #666;
						word-break: break-all;
						max-width: 400px;
						margin: 0 auto 30px auto;
					}
					.qr-image {
						display: block;
						max-width: 100%;
						height: auto;
						border-radius: 8px;
						box-shadow: 0 4px 8px rgba(0,0,0,0.1);
					}
					@media print {
						body { margin: 0; padding: 10mm; }
						@page { margin: 10mm; size: A4; }
					}
				</style>
			</head>
			<body>
				<div class="qr-header">
					<div class="qr-title">Table ${tableNumber}</div>
					<div class="qr-url">${url}</div>
				</div>
				<img class="qr-image" src="${(qrImg as HTMLImageElement).src}" alt="QR Code for Table ${tableNumber}" />
			</body>
			</html>
		`);

		printWindow.document.close();

		// Wait for content to load, then print and close
		printWindow.onload = () => {
			setTimeout(() => {
				printWindow.print();
				printWindow.close();
			}, 250);
		};
	}

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(url);
			toastStore.success('Link copied to clipboard!');
		} catch (error) {
			toastStore.error('Failed to copy link');
		}
	}

	function handleLinkClick() {
		window.open(url, '_blank');
	}
</script>

<Modal bind:open title="Table {tableNumber}" size="lg" outsideclose>
	<div class="space-y-6">
		<!-- Header description -->
		<p class="text-center text-gray-600 dark:text-gray-300">
			Scan the QR code or click the link to join
		</p>

		<!-- QR Code Section -->
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
						<button onclick={handleLinkClick} class="group w-full text-left">
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
	</div>

	{#snippet footer()}
		<div class="flex w-full justify-center gap-3">
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
			<Button onclick={() => (open = false)}>Close</Button>
		</div>
	{/snippet}
</Modal>
