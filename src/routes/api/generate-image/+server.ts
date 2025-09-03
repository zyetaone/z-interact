import { json } from '@sveltejs/kit';
import { imageGenerator } from '$lib/server/ai/image-generator';
import { R2Storage } from '$lib/server/r2-storage';
import { imageStorage } from '$lib/server/image-storage';

export async function POST({ request, platform }: { request: Request; platform?: any }) {
	let personaId = '';
	let prompt = '';
	let size = '1024x1024';
	let quality = 'standard';

	try {
		const body = await request.json();
		prompt = body.prompt || '';
		personaId = body.personaId || '';
		size = body.size || '1024x1024';
		quality = body.quality || 'standard';

		if (!prompt) {
			return json({ error: 'Prompt is required' }, { status: 400 });
		}

		if (!personaId) {
			return json({ error: 'Persona ID is required' }, { status: 400 });
		}

		console.log(`🎨 Generating image for persona: ${personaId}`);
		console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

		// Generate image using AI service
		const result = await imageGenerator.generateImage({
			prompt,
			size: size as any,
			quality: quality as any
		});

		console.log(
			`✅ Image generated with ${result.provider}: ${result.imageUrl.substring(0, 50)}...`
		);

		// Check if R2 storage is enabled and configured
		const enableR2 = platform?.env?.ENABLE_R2_STORAGE === 'true';
		const r2Configured = enableR2 && platform?.env?.R2_IMAGES;

		let finalImageUrl: string;
		let r2Key: string | undefined;
		let storageType: 'r2' | 'base64' = 'base64';
		let storageDetails: any = {};

		if (r2Configured) {
			try {
				console.log('☁️ Attempting R2 storage...');

				// Initialize R2 storage
				const r2Storage = new R2Storage({
					bucket: platform.env.R2_IMAGES,
					publicUrl: platform.env.R2_PUBLIC_URL,
					accountId: platform.env.R2_ACCOUNT_ID,
					bucketName: platform.env.R2_BUCKET_NAME
				});

				// Download image from AI service
				const response = await fetch(result.imageUrl);
				if (!response.ok) {
					throw new Error(`Failed to download image from AI service: ${response.status}`);
				}

				const contentType = response.headers.get('content-type');
				if (!contentType?.startsWith('image/')) {
					throw new Error(`Invalid content type: ${contentType}`);
				}

				const imageBuffer = await response.arrayBuffer();

				// Generate R2 key with organized structure
				const extension = r2Storage.getContentType(contentType).split('/')[1];
				r2Key = r2Storage.generateImageKey(personaId, extension);

				// Upload to R2 with comprehensive metadata
				const uploadResult = await r2Storage.uploadImage(imageBuffer, r2Key, {
					contentType,
					customMetadata: {
						personaId,
						prompt: result.prompt,
						provider: result.provider,
						generatedAt: new Date().toISOString(),
						size,
						quality,
						originalUrl: result.imageUrl
					}
				});

				finalImageUrl = uploadResult.publicUrl;
				storageType = 'r2';
				storageDetails = {
					r2Key,
					size: uploadResult.size,
					uploadedAt: uploadResult.uploadedAt
				};

				console.log(`✅ Image stored in R2: ${r2Key} (${uploadResult.size} bytes)`);
			} catch (r2Error) {
				console.error('❌ R2 storage failed, falling back to base64:', r2Error);

				// Comprehensive fallback to base64 storage
				try {
					const storageResult = await imageStorage.downloadAndStoreImage(result.imageUrl);
					finalImageUrl = storageResult.url;
					storageType = 'base64';
					storageDetails = {
						fallbackReason: r2Error instanceof Error ? r2Error.message : 'Unknown R2 error',
						base64Length: storageResult.data.length
					};

					console.log('✅ Fallback to base64 storage successful');
				} catch (fallbackError) {
					console.error('❌ Both R2 and base64 storage failed:', fallbackError);
					throw new Error(
						`Storage failed: R2 (${r2Error instanceof Error ? r2Error.message : 'Unknown'}) and base64 (${fallbackError instanceof Error ? fallbackError.message : 'Unknown'})`
					);
				}
			}
		} else {
			// Use traditional base64 storage
			console.log('💾 Using base64 storage (R2 not enabled or configured)');

			const storageResult = await imageStorage.downloadAndStoreImage(result.imageUrl);
			finalImageUrl = storageResult.url;
			storageType = 'base64';
			storageDetails = {
				base64Length: storageResult.data.length,
				r2Enabled: enableR2,
				r2Configured: !!platform?.env?.R2_IMAGES
			};
		}

		// Return comprehensive response
		return json({
			success: true,
			imageUrl: finalImageUrl,
			originalUrl: result.imageUrl,
			storage: {
				type: storageType,
				details: storageDetails,
				r2Key: r2Key || null
			},
			generation: {
				provider: result.provider,
				prompt: result.prompt,
				size,
				quality,
				metadata: result.metadata
			},
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('❌ Image generation error:', error);

		// Enhanced error response with more details
		const errorResponse: any = {
			error: 'Failed to generate image',
			details: error instanceof Error ? error.message : 'Unknown error',
			timestamp: new Date().toISOString(),
			request: {
				personaId: personaId || 'unknown',
				promptLength: prompt?.length || 0
			}
		};

		// Add storage-specific error information
		if (platform?.env?.ENABLE_R2_STORAGE === 'true') {
			errorResponse.storageStatus = {
				r2Enabled: true,
				r2Configured: !!platform?.env?.R2_IMAGES,
				r2PublicUrl: !!platform?.env?.R2_PUBLIC_URL
			};
		}

		return json(errorResponse, { status: 500 });
	}
}
