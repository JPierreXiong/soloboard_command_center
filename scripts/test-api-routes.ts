/**
 * Test Digital Heirloom API Routes
 * 
 * This script tests the API routes (requires server to be running)
 * 
 * Usage:
 *   1. Start server: pnpm dev
 *   2. Run test: npx tsx scripts/test-api-routes.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env.development') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  response?: any;
}

async function testApiRoute(
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<TestResult> {
  try {
    const url = `${BASE_URL}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    return {
      name: `${method} ${path}`,
      status: response.ok ? 'pass' : 'fail',
      message: `Status: ${response.status} - ${data.message || response.statusText}`,
      response: data,
    };
  } catch (error: any) {
    return {
      name: `${method} ${path}`,
      status: 'fail',
      message: `Error: ${error.message}`,
    };
  }
}

async function testApiRoutes() {
  console.log('🧪 Testing Digital Heirloom API Routes...\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const results: TestResult[] = [];

  // Test 1: Check if server is running
  console.log('1️⃣ Checking if server is running...');
  try {
    const response = await fetch(`${BASE_URL}/api/config/get-configs`);
    if (response.ok || response.status === 401) {
      console.log('   ✅ Server is running\n');
    } else {
      console.log('   ⚠️  Server responded with unexpected status:', response.status);
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ Server is not running');
      console.log('   ℹ️  Please start the server with: pnpm dev\n');
      return;
    }
  }

  // Test 2: Test unauthenticated access (should return 401)
  console.log('2️⃣ Testing authentication (should return 401)...');
  const authTest = await testApiRoute('GET', '/api/digital-heirloom/vault/get');
  results.push(authTest);
  if (authTest.status === 'pass' && authTest.response?.code === -1) {
    console.log(`   ✅ ${authTest.name}: ${authTest.message}\n`);
  } else {
    console.log(`   ⚠️  ${authTest.name}: ${authTest.message}\n`);
  }

  // Test 3: Test release endpoint (should work without auth but need token)
  console.log('3️⃣ Testing release endpoint (no auth required)...');
  const releaseTest = await testApiRoute('POST', '/api/digital-heirloom/release/request', {
    releaseToken: 'invalid-token',
  });
  results.push(releaseTest);
  if (releaseTest.response?.code === -1) {
    console.log(`   ✅ ${releaseTest.name}: Correctly rejected invalid token\n`);
  } else {
    console.log(`   ⚠️  ${releaseTest.name}: ${releaseTest.message}\n`);
  }

  // Test 4: Test invalid endpoint (should return 404)
  console.log('4️⃣ Testing invalid endpoint (should return 404)...');
  try {
    const response = await fetch(`${BASE_URL}/api/digital-heirloom/invalid`);
    const result: TestResult = {
      name: 'GET /api/digital-heirloom/invalid',
      status: response.status === 404 ? 'pass' : 'fail',
      message: `Status: ${response.status}`,
    };
    results.push(result);
    if (result.status === 'pass') {
      console.log(`   ✅ Invalid endpoint correctly returns 404\n`);
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}\n`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Summary
  console.log('📊 API Test Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  results.forEach((result) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'skip' ? '⏭️' : '❌';
    console.log(`   ${icon} ${result.name}`);
    console.log(`      ${result.message}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const passed = results.filter((r) => r.status === 'pass').length;
  const total = results.length;

  console.log(`✅ Passed: ${passed}/${total}`);
  console.log('\n📋 Next steps:');
  console.log('   1. Register a user account in the app');
  console.log('   2. Test authenticated API routes with session cookie');
  console.log('   3. Test full workflow: create vault → add beneficiaries → heartbeat');
}

// Wait a bit for server to start, then run tests
setTimeout(() => {
  testApiRoutes()
    .then(() => {
      console.log('\n✨ API route tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 API route tests failed:', error);
      process.exit(1);
    });
}, 3000); // Wait 3 seconds for server to start




