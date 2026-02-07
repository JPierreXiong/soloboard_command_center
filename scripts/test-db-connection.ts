/**
 * Test Database Connection
 * This script tests the database connection using the new DATABASE_URL
 * 
 * Run with: npx tsx scripts/test-db-connection.ts
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local file first (highest priority)
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env.development') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { envConfigs } from '@/config';

async function testConnection() {
  console.log('🧪 Testing Database Connection...\n');

  try {
    // 1. Check environment variables
    console.log('1️⃣ Checking environment variables...');
    const databaseUrl = process.env.DATABASE_URL || envConfigs.database_url;
    const provider = process.env.DATABASE_PROVIDER || envConfigs.database_provider;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set in environment variables');
    }

    console.log(`   ✓ Database provider: ${provider}`);
    console.log(`   ✓ Database URL: ${databaseUrl.substring(0, 50)}...`);
    console.log('   ✅ Environment variables configured\n');

    // 2. Test database connection using postgres directly
    console.log('2️⃣ Testing database connection...');
    let sql: ReturnType<typeof postgres> | null = null;
    try {
      sql = postgres(databaseUrl, {
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
      });

      // Simple query to test connection
      const result = await sql`SELECT 1 as test, NOW() as current_time`;
      console.log('   ✓ Connection successful');
      console.log(`   ✓ Query result: ${JSON.stringify(result[0])}`);
      console.log('   ✅ Database connection works\n');
    } catch (error: any) {
      console.error('   ❌ Database connection failed:');
      console.error(`   Error: ${error.message}`);
      if (error.cause) {
        console.error(`   Cause: ${error.cause.message || error.cause}`);
      }
      throw error;
    } finally {
      if (sql) {
        await sql.end();
      }
    }

    // 3. Test querying tables (if schema exists)
    console.log('3️⃣ Testing table queries...');
    sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    try {
      // Try to query information_schema to see if we can access database
      const tablesResult = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 5
      `;
      console.log(`   ✓ Found ${tablesResult.length} tables in public schema`);
      if (tablesResult.length > 0) {
        console.log('   ✓ Sample tables:');
        tablesResult.forEach((row: any) => {
          console.log(`     - ${row.table_name}`);
        });
      }
      console.log('   ✅ Table queries work\n');
    } catch (error: any) {
      console.log('   ⚠️  Could not query tables (schema might not be initialized yet)');
      console.log('   ℹ️  This is normal if you haven\'t run migrations yet');
      console.log(`   ℹ️  Error: ${error.message}\n`);
    } finally {
      if (sql) {
        await sql.end();
      }
    }

    console.log('✅ All database connection tests passed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run database migrations: pnpm db:push');
    console.log('   2. Initialize RBAC: pnpm rbac:init');
    console.log('   3. Start development server: pnpm dev');
  } catch (error: any) {
    console.error('\n❌ Database connection test failed!');
    console.error(`Error: ${error.message}`);
    if (error.cause) {
      console.error(`Cause: ${error.cause.message || error.cause}`);
    }
    process.exit(1);
  }
}

// Run the test
testConnection()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed with error:', error);
    process.exit(1);
  });

