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
	personaTitle?: string;
}

/**
 * Creates a print window with QR code content
 */
function createPrintWindow(content: string): Window | null {
	const printWindow = window.open('', '_blank');
	if (!printWindow) {
		toastStore.error('Pop-up blocked. Please allow pop-ups and try again.');
		return null;
	}

	// Parse content and build DOM without using deprecated document.write
	const parser = new DOMParser();
	const doc = parser.parseFromString(content, 'text/html');

	// Clear and rebuild the document
	printWindow.document.head.innerHTML = '';
	printWindow.document.body.innerHTML = '';

	// Copy head content
	if (doc.head) {
		Array.from(doc.head.children).forEach((child) => {
			printWindow.document.head.appendChild(printWindow.document.adoptNode(child.cloneNode(true)));
		});
	}

	// Copy body content
	if (doc.body) {
		Array.from(doc.body.children).forEach((child) => {
			printWindow.document.body.appendChild(printWindow.document.adoptNode(child.cloneNode(true)));
		});
	}

	return printWindow;
}

/**
 * Generates CSS styles for QR code printing
 */
function generatePrintStyles(options: PrintOptions = {}): string {
	const { gridColumns = 2 } = options;

	return `
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
			grid-template-columns: repeat(${gridColumns}, 1fr);
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
	`;
}

/**
 * Generates HTML content for a single QR code section
 */
function generateQRSection(data: QRPrintData, options: PrintOptions = {}): string {
	const { showPersona = false, personaTitle } = options;

	return `
		<div class="qr-section">
			<div class="qr-header">
				<div class="qr-title">${data.title}</div>
				${showPersona && personaTitle ? `<div class="qr-persona">${personaTitle}</div>` : ''}
				<div class="qr-url">${data.url}</div>
			</div>
			<img class="qr-image" src="${data.imageSrc}" alt="QR Code for ${data.title}" />
		</div>
	`;
}

/**
 * Prints a single QR code
 */
export function printSingleQR(data: QRPrintData): void {
	const content = `
		<!DOCTYPE html>
		<html>
		<head>
			<title>${data.title} QR Code</title>
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
				<div class="qr-title">${data.title}</div>
				<div class="qr-url">${data.url}</div>
			</div>
			<img class="qr-image" src="${data.imageSrc}" alt="QR Code for ${data.title}" />
		</body>
		</html>
	`;

	const printWindow = createPrintWindow(content);
	if (!printWindow) return;

	printWindow.onload = () => {
		setTimeout(() => {
			printWindow.print();
			printWindow.close();
		}, 250);
	};
}

/**
 * Prints multiple QR codes in a grid layout
 */
export function printMultipleQRs(qrData: QRPrintData[], options: PrintOptions = {}): void {
	const { pageTitle = 'QR Codes', gridColumns = 2 } = options;

	// Generate all QR sections
	const qrSections = qrData.map((data) => generateQRSection(data, options)).join('');

	const content = `
		<!DOCTYPE html>
		<html>
		<head>
			<title>${pageTitle}</title>
			<style>
				${generatePrintStyles({ ...options, gridColumns })}
			</style>
		</head>
		<body>
			<div class="page-title">${pageTitle}</div>
			<div class="qr-grid">
				${qrSections}
			</div>
		</body>
		</html>
	`;

	const printWindow = createPrintWindow(content);
	if (!printWindow) return;

	printWindow.onload = () => {
		setTimeout(() => {
			printWindow.print();
			printWindow.close();
			toastStore.success('QR codes sent to printer');
		}, 500);
	};
}

/**
 * Extracts QR code image source from DOM element
 */
export function extractQRImageSrc(selector: string): string | null {
	// Try to find img element first
	const imgElement = document.querySelector(`${selector} img`) as HTMLImageElement;
	if (imgElement?.src) {
		return imgElement.src;
	}

	// Try to find canvas element and convert to data URL
	const canvasElement = document.querySelector(`${selector} canvas`) as HTMLCanvasElement;
	if (canvasElement) {
		return canvasElement.toDataURL('image/png');
	}

	return null;
}
