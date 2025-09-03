#!/usr/bin/env node

/**
 * R2 Storage Test Script
 * Tests the R2 bucket connectivity and basic operations
 */

const https = require('https');
const http = require('http');

// Test configuration
const config = {
	bucketName: 'z-interact-images',
	testFile: 'test-image.txt',
	testContent: 'Hello from z-interact R2 test!'
};

console.log('🧪 Testing Cloudflare R2 Storage Setup');
console.log('=====================================');

// Check if wrangler is available
function checkWrangler() {
	return new Promise((resolve) => {
		const { spawn } = require('child_process');
		const wrangler = spawn('wrangler', ['--version'], { stdio: 'pipe' });

		wrangler.on('close', (code) => {
			resolve(code === 0);
		});

		wrangler.on('error', () => {
			resolve(false);
		});
	});
}

// Test wrangler authentication
async function testWranglerAuth() {
	console.log('\n1. Testing Wrangler CLI...');

	const hasWrangler = await checkWrangler();
	if (!hasWrangler) {
		console.log('❌ Wrangler CLI not found. Install with: npm install -g wrangler');
		return false;
	}

	console.log('✅ Wrangler CLI is installed');

	return new Promise((resolve) => {
		const { spawn } = require('child_process');
		const authCheck = spawn('wrangler', ['auth', 'status'], { stdio: 'pipe' });

		let output = '';
		authCheck.stdout.on('data', (data) => {
			output += data.toString();
		});

		authCheck.on('close', (code) => {
			if (code === 0) {
				console.log('✅ Wrangler authentication is valid');
				resolve(true);
			} else {
				console.log('❌ Wrangler authentication failed. Run: wrangler auth login');
				resolve(false);
			}
		});
	});
}

// Test R2 bucket access
async function testR2Bucket() {
	console.log('\n2. Testing R2 bucket access...');

	return new Promise((resolve) => {
		const { spawn } = require('child_process');
		const bucketList = spawn('wrangler', ['r2', 'bucket', 'list'], { stdio: 'pipe' });

		let output = '';
		bucketList.stdout.on('data', (data) => {
			output += data.toString();
		});

		bucketList.on('close', (code) => {
			if (code === 0 && output.includes(config.bucketName)) {
				console.log(`✅ R2 bucket '${config.bucketName}' exists and is accessible`);
				resolve(true);
			} else if (code === 0) {
				console.log(`❌ R2 bucket '${config.bucketName}' not found in your account`);
				console.log('   Run: ./scripts/setup-r2.sh to create it');
				resolve(false);
			} else {
				console.log('❌ Failed to list R2 buckets. Check your authentication.');
				resolve(false);
			}
		});
	});
}

// Test basic R2 operations
async function testR2Operations() {
	console.log('\n3. Testing R2 operations...');

	return new Promise((resolve) => {
		const { spawn } = require('child_process');

		// Create a test file
		const echo = spawn('echo', [config.testContent], { stdio: ['pipe', 'pipe', 'pipe'] });
		const wranglerPut = spawn(
			'wrangler',
			['r2', 'object', 'put', `${config.bucketName}/${config.testFile}`],
			{
				stdio: ['pipe', 'pipe', 'pipe']
			}
		);

		echo.stdout.pipe(wranglerPut.stdin);

		wranglerPut.on('close', (code) => {
			if (code === 0) {
				console.log(`✅ Successfully uploaded test file to R2`);

				// Now try to list it
				const listCheck = spawn('wrangler', ['r2', 'object', 'list', config.bucketName], {
					stdio: 'pipe'
				});

				let listOutput = '';
				listCheck.stdout.on('data', (data) => {
					listOutput += data.toString();
				});

				listCheck.on('close', (listCode) => {
					if (listCode === 0 && listOutput.includes(config.testFile)) {
						console.log(`✅ Test file found in bucket`);

						// Clean up test file
						const deleteTest = spawn(
							'wrangler',
							['r2', 'object', 'delete', `${config.bucketName}/${config.testFile}`],
							{
								stdio: 'pipe'
							}
						);

						deleteTest.on('close', () => {
							console.log(`🧹 Cleaned up test file`);
							resolve(true);
						});
					} else {
						console.log(`❌ Test file not found in bucket listing`);
						resolve(false);
					}
				});
			} else {
				console.log(`❌ Failed to upload test file to R2`);
				resolve(false);
			}
		});
	});
}

// Check wrangler.toml configuration
function checkWranglerConfig() {
	console.log('\n4. Checking wrangler.toml configuration...');

	try {
		const fs = require('fs');
		const path = require('path');
		const configPath = path.join(process.cwd(), 'wrangler.toml');
		const configContent = fs.readFileSync(configPath, 'utf8');

		const checks = [
			{
				name: 'R2 bucket binding',
				pattern: /\[\[r2_buckets\]\]/,
				found: configContent.includes('[[r2_buckets]]')
			},
			{
				name: 'R2 bucket name',
				pattern: /bucket_name = "z-interact-images"/,
				found: configContent.includes('bucket_name = "z-interact-images"')
			},
			{
				name: 'R2 binding name',
				pattern: /binding = "R2_IMAGES"/,
				found: configContent.includes('binding = "R2_IMAGES"')
			},
			{
				name: 'ENABLE_R2_STORAGE variable',
				pattern: /ENABLE_R2_STORAGE/,
				found: configContent.includes('ENABLE_R2_STORAGE')
			}
		];

		checks.forEach((check) => {
			if (check.found) {
				console.log(`✅ ${check.name} found`);
			} else {
				console.log(`❌ ${check.name} missing`);
			}
		});

		const allPassed = checks.every((check) => check.found);
		if (allPassed) {
			console.log('✅ wrangler.toml configuration looks good');
		} else {
			console.log('⚠️  Some configuration items are missing from wrangler.toml');
		}

		return allPassed;
	} catch (error) {
		console.log('❌ Could not read wrangler.toml file');
		return false;
	}
}

// Main test function
async function runTests() {
	console.log('Starting R2 storage tests...\n');

	const results = {
		wrangler: await testWranglerAuth(),
		bucket: await testR2Bucket(),
		operations: false,
		config: checkWranglerConfig()
	};

	// Only test operations if bucket exists
	if (results.bucket) {
		results.operations = await testR2Operations();
	} else {
		console.log('\n⏭️  Skipping R2 operations test (bucket not accessible)');
	}

	console.log('\n📊 Test Results Summary');
	console.log('=======================');

	Object.entries(results).forEach(([test, passed]) => {
		const status = passed ? '✅ PASS' : '❌ FAIL';
		console.log(`${status} ${test.charAt(0).toUpperCase() + test.slice(1)}`);
	});

	const allPassed = Object.values(results).every((result) => result);

	console.log(
		'\n' +
			(allPassed
				? '🎉 All tests passed! Your R2 setup is ready.'
				: '⚠️  Some tests failed. Please check the output above and fix any issues.')
	);

	if (!results.wrangler) {
		console.log('\n💡 Quick fixes:');
		console.log('   - Install wrangler: npm install -g wrangler');
		console.log('   - Login to Cloudflare: wrangler auth login');
	}

	if (!results.bucket) {
		console.log('\n💡 To create the R2 bucket:');
		console.log('   - Run: ./scripts/setup-r2.sh');
	}

	process.exit(allPassed ? 0 : 1);
}

// Run the tests
runTests().catch((error) => {
	console.error('❌ Test script failed:', error.message);
	process.exit(1);
});
