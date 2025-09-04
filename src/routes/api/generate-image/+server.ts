import { imageGenerator } from '$lib/server/ai/image-generator';
import { R2Storage } from '$lib/server/r2-storage';
import { imageStorage } from '$lib/server/image-storage';
import { withApiHandler, Validation, ApiResponse, HTTP_STATUS } from '$lib/server/api-utils';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	return withApiHandler(
		event,
		async () => {
			const { request, platform } = event;
			const body = await request.json();

			// Validate required fields
			const prompt = Validation.string(body.prompt, 'prompt');
			const personaId = Validation.string(body.personaId, 'personaId');
			const size = body.size || '1024x1024';
			const quality = body.quality || 'standard';

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
			const enableR2 = (platform as any)?.env?.ENABLE_R2_STORAGE === 'true';
			const r2Configured = enableR2 && (platform as any)?.env?.R2_IMAGES;

			let finalImageUrl: string;
			let r2Key: string | undefined;
			let storageType: 'r2' | 'base64' = 'base64';
			let storageDetails: any = {};

			if (r2Configured) {
				try {
					console.log('☁️ Attempting R2 storage...');

					// Initialize R2 storage
					const r2Storage = new R2Storage({
						bucket: (platform as any).env.R2_IMAGES,
						publicUrl: (platform as any).env.R2_PUBLIC_URL,
						accountId: (platform as any).env.R2_ACCOUNT_ID,
						bucketName: (platform as any).env.R2_BUCKET_NAME
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
					r2Configured: !!r2Configured
				};
			}

			// Return comprehensive response
			return {
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
				}
			};
		},
		'generate-image'
	);
}
