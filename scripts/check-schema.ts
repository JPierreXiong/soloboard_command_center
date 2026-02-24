/**
 * 检查数据库表结构
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_au5XJdonk1Es@ep-mute-smoke-ainrvel2-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

const client = postgres(DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10 });

async function checkSchema() {
  try {
    console.log('🔍 检查 monitored_sites 表结构...\n');
    
    const result = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'monitored_sites'
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 表字段:');
    result.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n✅ 检查完成');
    
  } catch (error: any) {
    console.error('❌ 错误:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();

