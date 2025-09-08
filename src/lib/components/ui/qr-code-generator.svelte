<script lang="ts">
	import QRCode from 'qrcode';

	interface QRCodeGeneratorProps {
		url: string;
		size?: number;
		class?: string;
	}

	let { url, size = 200, class: className = '' }: QRCodeGeneratorProps = $props();

	let qrCodeDataUrl = $state<string>('');
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Generate QR code reactively when URL changes or component mounts
	$effect(() => {
		if (url) {
			generateQRCode();
		}
	});

	async function generateQRCode() {
		try {
			loading = true;
			error = null;

			const dataUrl = await QRCode.toDataURL(url, {
				width: size,
				margin: 2,
				color: {
					dark: '#1e293b', // slate-800
					light: '#ffffff'
				},
				errorCorrectionLevel: 'M'
			});

			qrCodeDataUrl = dataUrl;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate QR code';
		} finally {
			loading = false;
		}
	}
</script>

<div class="qr-code-container {className}">
	{#if loading}
		<div
			class="flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"
			style="width: {size}px; height: {size}px;"
		>
			<div class="h-6 w-6 animate-spin rounded-full border-b-2 border-slate-600"></div>
		</div>
	{:else if error}
		<div
			class="flex items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
			style="width: {size}px; height: {size}px;"
		>
			<div class="text-center">
				<div class="mb-1 text-lg">⚠️</div>
				<div class="text-xs">QR Error</div>
			</div>
		</div>
	{:else if qrCodeDataUrl}
		<img
			src={qrCodeDataUrl}
			alt="QR Code for {url}"
			class="rounded-lg shadow-sm"
			style="width: {size}px; height: {size}px;"
		/>
	{:else}
		<div
			class="flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"
			style="width: {size}px; height: {size}px;"
		>
			<div class="text-center text-slate-500">
				<div class="mb-1 text-lg">📱</div>
				<div class="text-xs">No QR Code</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.qr-code-container {
		display: inline-block;
	}
</style>
