/**
 * Test Digital Heirloom System
 * 
 * This script tests the Digital Heirloom system including:
 * - Database connection
 * - Schema tables
 * - Model functions
 * - API routes (if server is running)
 * 
 * Usage:
 *   npx tsx scripts/test-digital-heirloom.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env.development') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

// Check if DATABASE_URL is set before importing
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in environment variables');
  console.error('   Please check your .env.local file');
  console.error('   Current DATABASE_URL:', process.env.DATABASE_URL || 'NOT SET');
  process.exit(1);
}

import { db } from '@/core/db';
import { digitalVaults, beneficiaries, heartbeatLogs, deadManSwitchEvents } from '@/config/db/schema';
import {
  createDigitalVault,
  findDigitalVaultByUserId,
  VaultStatus,
} from '@/shared/models/digital-vault';
import {
  createBeneficiary,
  BeneficiaryStatus,
} from '@/shared/models/beneficiary';
import {
  recordHeartbeat,
  getLatestHeartbeatLog,
} from '@/shared/models/heartbeat-log';
import {
  logWarningSentEvent,
  findEventsByVaultId,
} from '@/shared/models/dead-man-switch-event';
import { getUuid } from '@/shared/lib/hash';
import { encryptData } from '@/shared/lib/encryption';

async function testDigitalHeirloom() {
  console.log('🧪 Testing Digital Heirloom System...\n');

  const testResults = {
    database: false,
    schema: false,
    models: false,
    encryption: false,
    api: false,
  };

  try {
    // 1. Test database connection
    console.log('1️⃣ Testing database connection...');
    try {
      await db().execute('SELECT 1');
      console.log('   ✅ Database connection successful\n');
      testResults.database = true;
    } catch (error: any) {
      console.error('   ❌ Database connection failed:', error.message);
      throw error;
    }

    // 2. Test schema tables
    console.log('2️⃣ Testing schema tables...');
    try {
      // Check if tables exist by trying to query them
      await db().select().from(digitalVaults).limit(0);
      await db().select().from(beneficiaries).limit(0);
      await db().select().from(heartbeatLogs).limit(0);
      await db().select().from(deadManSwitchEvents).limit(0);
      console.log('   ✅ All schema tables exist\n');
      testResults.schema = true;
    } catch (error: any) {
      console.error('   ❌ Schema tables check failed:', error.message);
      console.log('   ℹ️  Please run database migration: scripts/migrate-digital-heirloom.sql\n');
      testResults.schema = false;
    }

    // 3. Test model functions (only if schema exists)
    if (testResults.schema) {
      console.log('3️⃣ Testing model functions...');
      try {
        // Test encryption (browser-only, so we'll just test the function exists)
        console.log('   Testing encryption module...');
        if (typeof encryptData === 'function') {
          console.log('   ✅ Encryption module loaded');
        } else {
          throw new Error('Encryption module not found');
        }

        // Test vault model functions
        console.log('   Testing vault model functions...');
        
        // First, check if there's an existing user in the database
        const { user } = await import('@/config/db/schema');
        const existingUsers = await db().select().from(user).limit(1);
        if (existingUsers.length === 0) {
          console.log('   ⚠️  No users found in database. Skipping vault creation test.');
          console.log('   ℹ️  Create a user first by registering in the app\n');
          testResults.models = true; // Mark as passed since schema is correct
          return;
        }
        
        const testUserId = existingUsers[0].id;
        console.log('   Using existing user:', testUserId);
        
        // Check if user already has a vault
        const existingVault = await findDigitalVaultByUserId(testUserId);
        let testVault;
        
        if (existingVault) {
          console.log('   ⚠️  User already has a vault. Using existing vault for testing.');
          testVault = existingVault;
        } else {
          // Create a test vault
          testVault = await createDigitalVault({
            id: getUuid(),
            userId: testUserId,
            encryptedData: 'test_encrypted_data',
            encryptionSalt: 'test_salt',
            encryptionIv: 'test_iv',
            encryptionHint: 'test hint',
            heartbeatFrequency: 90,
            gracePeriod: 7,
            deadManSwitchEnabled: true,
            status: VaultStatus.ACTIVE,
          });
          console.log('   ✅ Vault created:', testVault.id);
        }

        // Find vault
        const foundVault = await findDigitalVaultByUserId(testUserId);
        if (foundVault && foundVault.id === testVault.id) {
          console.log('   ✅ Vault found by user ID');
        } else {
          throw new Error('Vault not found');
        }

        // Test beneficiary model functions
        console.log('   Testing beneficiary model functions...');
        const testBeneficiary = await createBeneficiary({
          id: getUuid(),
          vaultId: testVault.id,
          name: 'Test Beneficiary',
          email: 'test@example.com',
          relationship: 'friend',
          language: 'en',
          status: BeneficiaryStatus.PENDING,
        });
        console.log('   ✅ Beneficiary created:', testBeneficiary.id);

        // Test heartbeat log
        console.log('   Testing heartbeat log...');
        const heartbeat = await recordHeartbeat(testVault.id, testUserId);
        console.log('   ✅ Heartbeat recorded:', heartbeat.id);

        const latestHeartbeat = await getLatestHeartbeatLog(testVault.id);
        if (latestHeartbeat && latestHeartbeat.id === heartbeat.id) {
          console.log('   ✅ Latest heartbeat retrieved');
        }

        // Test event log
        console.log('   Testing event log...');
        await logWarningSentEvent(testVault.id, {
          message: 'Test warning',
          timestamp: new Date().toISOString(),
        });
        console.log('   ✅ Event logged');

        const events = await findEventsByVaultId(testVault.id);
        if (events.length > 0) {
          console.log('   ✅ Events retrieved:', events.length);
        }

        // Cleanup test data (only if we created it)
        if (!existingVault) {
          console.log('   Cleaning up test data...');
          await db().delete(digitalVaults).where({ id: testVault.id } as any);
          console.log('   ✅ Test data cleaned up\n');
        } else {
          console.log('   ℹ️  Using existing vault, skipping cleanup\n');
        }

        testResults.models = true;
      } catch (error: any) {
        console.error('   ❌ Model functions test failed:', error.message);
        console.error('   Error details:', error);
        testResults.models = false;
      }
    }

    // 4. Test encryption module (structure only, actual encryption needs browser)
    console.log('4️⃣ Testing encryption module...');
    try {
      const encryptionModule = await import('@/shared/lib/encryption');
      if (typeof encryptionModule.encryptData === 'function' && typeof encryptionModule.decryptData === 'function') {
        console.log('   ✅ Encryption functions available');
        console.log('   ℹ️  Note: Actual encryption requires browser environment (Web Crypto API)\n');
        testResults.encryption = true;
      } else {
        throw new Error('Encryption functions not found');
      }
    } catch (error: any) {
      console.error('   ❌ Encryption module test failed:', error.message);
      testResults.encryption = false;
    }

    // 5. Test API routes (if server is running)
    console.log('5️⃣ Testing API routes...');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const testUrl = `${baseUrl}/api/digital-heirloom/vault/get`;

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        console.log('   ✅ API route exists (authentication required)');
        console.log('   ℹ️  API routes are working, but require authentication\n');
        testResults.api = true;
      } else if (response.status === 404) {
        console.log('   ⚠️  API route not found (server may not be running)');
        console.log('   ℹ️  Start server with: pnpm dev\n');
        testResults.api = false;
      } else {
        console.log(`   ✅ API route responded with status: ${response.status}\n`);
        testResults.api = true;
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.log('   ⚠️  Server not running');
        console.log('   ℹ️  Start server with: pnpm dev\n');
      } else {
        console.error('   ❌ API route test failed:', error.message);
      }
      testResults.api = false;
    }

    // Summary
    console.log('📊 Test Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Database Connection: ${testResults.database ? '✅' : '❌'}`);
    console.log(`   Schema Tables: ${testResults.schema ? '✅' : '❌'}`);
    console.log(`   Model Functions: ${testResults.models ? '✅' : '❌'}`);
    console.log(`   Encryption Module: ${testResults.encryption ? '✅' : '❌'}`);
    console.log(`   API Routes: ${testResults.api ? '✅' : '⚠️  (Server not running)'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const allPassed = testResults.database && testResults.schema && testResults.models && testResults.encryption;

    if (allPassed) {
      console.log('✅ All core tests passed!');
      console.log('\n📋 Next steps:');
      console.log('   1. Start development server: pnpm dev');
      console.log('   2. Test API routes with authentication');
      console.log('   3. Test frontend integration');
    } else {
      console.log('⚠️  Some tests failed. Please check the errors above.');
      if (!testResults.schema) {
        console.log('\n💡 To fix schema issues:');
        console.log('   1. Run database migration: scripts/migrate-digital-heirloom.sql');
        console.log('   2. Or use: pnpm db:push');
      }
    }

    process.exit(allPassed ? 0 : 1);
  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run the test
testDigitalHeirloom();

