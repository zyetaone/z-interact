import { toastStore } from '$lib/stores/toast.svelte';

export interface QRPrintData {
	title: string;
	url: string;
	imageSrc: string;
}

export interface PrintOptions {
	pageTitle?: string;
	gridColumns?: number;
	showPersona?: boolean;
}

/**
 * Extract QR image source from DOM element
 */
export function extractQRImageSrc(selector: string): string | null {
	const element = document.querySelector(selector);
	const img = element?.querySelector('img');
	return img?.src || null;
}

/**
 * Print a single QR code
 */
export function printSingleQR(data: QRPrintData): void {
	const printWindow = window.open('', '_blank');
	if (!printWindow) {
		toastStore.error('Pop-up blocked. Please allow pop-ups and try again.');
		return;
	}

	const content = `
		<!DOCTYPE html>
		<html>
		<head>
			<title>QR Code - ${data.title}</title>
			<style>
				body { font-family: Arial, sans-serif; text-align: center; margin: 20px; }
				img { max-width: 300px; height: auto; }
				h1 { margin: 10px 0; }
				p { margin: 5px 0; font-size: 14px; color: #666; }
				@media print { body { margin: 0; } }
			</style>
		</head>
		<body>
			<h1>${data.title}</h1>
			<img src="${data.imageSrc}" alt="QR Code" />
			<p>${data.url}</p>
		</body>
		</html>
	`;

	printWindow.document.write(content);
	printWindow.document.close();
	printWindow.focus();
	setTimeout(() => {
		printWindow.print();
		printWindow.close();
	}, 250);
}

/**
 * Print multiple QR codes in a grid
 */
export function printMultipleQRs(qrData: QRPrintData[], options: PrintOptions = {}): void {
	const { pageTitle = 'QR Codes', gridColumns = 2 } = options;

	const printWindow = window.open('', '_blank');
	if (!printWindow) {
		toastStore.error('Pop-up blocked. Please allow pop-ups and try again.');
		return;
	}

	const qrItems = qrData
		.map(
			(data) => `
		<div class="qr-item">
			<h3>${data.title}</h3>
			<img src="${data.imageSrc}" alt="QR Code for ${data.title}" />
			<p>${data.url}</p>
		</div>
	`
		)
		.join('');

	const content = `
		<!DOCTYPE html>
		<html>
		<head>
			<title>${pageTitle}</title>
			<style>
				body { font-family: Arial, sans-serif; margin: 20px; }
				h1 { text-align: center; margin-bottom: 30px; }
				.qr-grid { display: grid; grid-template-columns: repeat(${gridColumns}, 1fr); gap: 30px; }
				.qr-item { text-align: center; page-break-inside: avoid; }
				.qr-item h3 { margin: 0 0 10px 0; }
				.qr-item img { max-width: 200px; height: auto; }
				.qr-item p { margin: 10px 0 0 0; font-size: 12px; color: #666; }
				@media print { 
					body { margin: 0; } 
					.qr-item { break-inside: avoid; }
				}
			</style>
		</head>
		<body>
			<h1>${pageTitle}</h1>
			<div class="qr-grid">
				${qrItems}
			</div>
		</body>
		</html>
	`;

	printWindow.document.write(content);
	printWindow.document.close();
	printWindow.focus();
	setTimeout(() => {
		printWindow.print();
		printWindow.close();
	}, 250);
}
