<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui';
	
	interface StorageStats {
		success: boolean;
		database: {
			totalImages: number;
			r2Images: number;
			base64Images: number;
			mixedImages: number;
			r2Percentage: number;
			base64Percentage: number;
		};
		r2: {
			enabled: boolean;
			configured: boolean;
			stats: {
				objectCount: number;
				totalSize: number;
				totalSizeFormatted: string;
				hasMoreObjects: boolean;
				bucketName: string;
				publicUrl: string;
			} | null;
			error: string | null;
		};
		health: {
			status: 'excellent' | 'good' | 'warning' | 'critical';
			score: number;
			issues: string[];
			summary: string;
		};
		recommendations: string[];
	}

	interface MigrationStats {
		success: boolean;
		action: string;
		result: {
			migrated: number;
			skipped: number;
			failed: number;
			errors?: string[];
			hasMore?: boolean;
		};
		dryRun: boolean;
	}

	let storageStats: StorageStats | null = $state(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let migrationInProgress = $state(false);
	let migrationResult: MigrationStats | null = $state(null);

	onMount(() => {
		loadStorageStats();
	});

	async function loadStorageStats() {
		try {
			loading = true;
			error = null;
			const response = await fetch('/api/storage-stats');
			const data = await response.json();
			
			if (!response.ok) {
				throw new Error(data.error || 'Failed to load storage statistics');
			}
			
			storageStats = data;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	async function startMigration() {
		try {
			migrationInProgress = true;
			migrationResult = null;
			
			const response = await fetch('/api/migrate-images', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					action: 'migrate',
					batchSize: 10,
					concurrency: 3
				})
			});
			
			const data = await response.json();
			
			if (!response.ok) {
				throw new Error(data.error || 'Migration failed');
			}
			
			migrationResult = data;
			// Reload stats after migration
			await loadStorageStats();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Migration failed';
		} finally {
			migrationInProgress = false;
		}
	}

	function getHealthStatusColor(status: string): string {
		switch (status) {
			case 'excellent': return 'text-green-600 bg-green-50';
			case 'good': return 'text-blue-600 bg-blue-50';
			case 'warning': return 'text-yellow-600 bg-yellow-50';
			case 'critical': return 'text-red-600 bg-red-50';
			default: return 'text-gray-600 bg-gray-50';
		}
	}

	function getHealthStatusIcon(status: string): string {
		switch (status) {
			case 'excellent': return '✅';
			case 'good': return '💚';
			case 'warning': return '⚠️';
			case 'critical': return '🚨';
			default: return '❓';
		}
	}
</script>

<svelte:head>
	<title>Z-Interact - Storage Dashboard</title>
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-slate-100 to-gray-200 p-4 md:p-8">
	<div class="container mx-auto max-w-6xl">
		<!-- Header -->
		<header class="mb-8">
			<h1 class="text-4xl font-bold tracking-tight text-slate-900 mb-2">
				Storage Dashboard
			</h1>
			<p class="text-slate-600 text-lg">
				Monitor and manage image storage across R2 and database systems.
			</p>
			<div class="mt-4 flex gap-4">
				<Button onclick={loadStorageStats} disabled={loading} variant="outline">
					{loading ? 'Refreshing...' : 'Refresh Stats'}
				</Button>
				<a href="/">
					<Button variant="ghost">← Back to Admin</Button>
				</a>
			</div>
		</header>

		{#if loading}
			<div class="text-center py-16">
				<div class="animate-spin text-4xl mb-4">⚙️</div>
				<p class="text-slate-600">Loading storage statistics...</p>
			</div>
		{:else if error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
				<div class="flex items-center mb-2">
					<span class="text-2xl mr-2">🚨</span>
					<h3 class="text-lg font-semibold text-red-800">Error</h3>
				</div>
				<p class="text-red-700">{error}</p>
				<Button onclick={loadStorageStats} class="mt-4" variant="outline">
					Try Again
				</Button>
			</div>
		{:else if storageStats}
			<!-- Health Status -->
			<div class="bg-white rounded-lg shadow-md p-6 mb-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-xl font-semibold text-slate-800">Storage Health</h2>
					<div class="flex items-center gap-2">
						<span class="text-2xl">{getHealthStatusIcon(storageStats.health.status)}</span>
						<span class="px-3 py-1 rounded-full text-sm font-medium {getHealthStatusColor(storageStats.health.status)}">
							{storageStats.health.status.toUpperCase()}
						</span>
						<span class="text-lg font-bold text-slate-700">
							{storageStats.health.score}/100
						</span>
					</div>
				</div>
				
				<p class="text-slate-600 mb-4">{storageStats.health.summary}</p>
				
				{#if storageStats.health.issues.length > 0}
					<div class="mb-4">
						<h3 class="text-sm font-medium text-slate-700 mb-2">Issues:</h3>
						<ul class="list-disc list-inside space-y-1">
							{#each storageStats.health.issues as issue}
								<li class="text-sm text-red-600">⚠️ {issue}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if storageStats.recommendations.length > 0}
					<div>
						<h3 class="text-sm font-medium text-slate-700 mb-2">Recommendations:</h3>
						<ul class="list-disc list-inside space-y-1">
							{#each storageStats.recommendations as rec}
								<li class="text-sm text-blue-600">💡 {rec}</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>

			<!-- Statistics Grid -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<!-- Database Statistics -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<h2 class="text-xl font-semibold text-slate-800 mb-4">Database Statistics</h2>
					
					<div class="space-y-4">
						<div class="flex justify-between items-center">
							<span class="text-slate-600">Total Images:</span>
							<span class="text-xl font-bold text-slate-800">
								{storageStats.database.totalImages.toLocaleString()}
							</span>
						</div>
						
						<div class="flex justify-between items-center">
							<span class="text-slate-600">R2 Storage:</span>
							<div class="text-right">
								<span class="text-lg font-semibold text-green-600">
									{storageStats.database.r2Images.toLocaleString()}
								</span>
								<span class="text-sm text-slate-500 ml-1">
									({storageStats.database.r2Percentage}%)
								</span>
							</div>
						</div>
						
						<div class="flex justify-between items-center">
							<span class="text-slate-600">Base64 Storage:</span>
							<div class="text-right">
								<span class="text-lg font-semibold text-orange-600">
									{storageStats.database.base64Images.toLocaleString()}
								</span>
								<span class="text-sm text-slate-500 ml-1">
									({storageStats.database.base64Percentage}%)
								</span>
							</div>
						</div>

						{#if storageStats.database.mixedImages > 0}
							<div class="flex justify-between items-center">
								<span class="text-slate-600">Mixed State:</span>
								<span class="text-lg font-semibold text-red-600">
									{storageStats.database.mixedImages.toLocaleString()}
								</span>
							</div>
						{/if}

						<!-- Progress Bar -->
						{#if storageStats.database.totalImages > 0}
							<div class="mt-4">
								<div class="flex justify-between text-xs text-slate-600 mb-1">
									<span>Storage Distribution</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div 
										class="bg-green-500 h-2 rounded-l-full"
										style="width: {storageStats.database.r2Percentage}%"
									></div>
									<div 
										class="bg-orange-500 h-2 rounded-r-full"
										style="width: {storageStats.database.base64Percentage}%; margin-left: {storageStats.database.r2Percentage}%"
									></div>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- R2 Statistics -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<h2 class="text-xl font-semibold text-slate-800 mb-4">R2 Storage</h2>
					
					<div class="space-y-4">
						<div class="flex justify-between items-center">
							<span class="text-slate-600">Status:</span>
							<span class="px-2 py-1 rounded text-sm font-medium {storageStats.r2.configured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
								{storageStats.r2.configured ? 'Configured' : 'Not Configured'}
							</span>
						</div>

						{#if storageStats.r2.error}
							<div class="bg-red-50 border border-red-200 rounded p-3">
								<span class="text-red-600 text-sm">⚠️ {storageStats.r2.error}</span>
							</div>
						{/if}

						{#if storageStats.r2.stats}
							<div class="flex justify-between items-center">
								<span class="text-slate-600">Objects in Bucket:</span>
								<span class="text-lg font-semibold text-slate-800">
									{storageStats.r2.stats.objectCount.toLocaleString()}
									{#if storageStats.r2.stats.hasMoreObjects}
										<span class="text-sm text-slate-500">+</span>
									{/if}
								</span>
							</div>

							<div class="flex justify-between items-center">
								<span class="text-slate-600">Total Size:</span>
								<span class="text-lg font-semibold text-slate-800">
									{storageStats.r2.stats.totalSizeFormatted}
								</span>
							</div>

							<div class="flex justify-between items-center">
								<span class="text-slate-600">Bucket:</span>
								<span class="text-sm font-mono text-slate-600">
									{storageStats.r2.stats.bucketName}
								</span>
							</div>

							{#if storageStats.r2.stats.publicUrl}
								<div class="flex justify-between items-center">
									<span class="text-slate-600">Public URL:</span>
									<a 
										href={storageStats.r2.stats.publicUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="text-sm font-mono text-blue-600 hover:underline"
									>
										{storageStats.r2.stats.publicUrl}
									</a>
								</div>
							{/if}
						{/if}
					</div>
				</div>
			</div>

			<!-- Migration Section -->
			{#if storageStats.database.base64Images > 0}
				<div class="bg-white rounded-lg shadow-md p-6 mb-6">
					<h2 class="text-xl font-semibold text-slate-800 mb-4">Image Migration</h2>
					
					<div class="flex items-center justify-between mb-4">
						<div>
							<p class="text-slate-600">
								{storageStats.database.base64Images.toLocaleString()} images need migration to R2 storage.
							</p>
							<p class="text-sm text-slate-500">
								This will improve performance and reduce database size.
							</p>
						</div>
						
						<Button 
							onclick={startMigration}
							disabled={migrationInProgress || !storageStats.r2.configured}
							variant="default"
						>
							{migrationInProgress ? 'Migrating...' : 'Start Migration'}
						</Button>
					</div>

					{#if migrationResult}
						<div class="bg-blue-50 border border-blue-200 rounded p-4 mt-4">
							<h3 class="font-medium text-blue-800 mb-2">Migration Results</h3>
							<div class="grid grid-cols-3 gap-4 text-sm">
								<div>
									<span class="text-green-600 font-medium">✅ Migrated:</span>
									{migrationResult.result.migrated}
								</div>
								<div>
									<span class="text-yellow-600 font-medium">⏭️ Skipped:</span>
									{migrationResult.result.skipped}
								</div>
								<div>
									<span class="text-red-600 font-medium">❌ Failed:</span>
									{migrationResult.result.failed}
								</div>
							</div>
							{#if migrationResult.result.hasMore}
								<p class="text-blue-600 text-sm mt-2">
									💡 More images available for migration. Run again to continue.
								</p>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</main>