/**
 * 简化版：快速添加网站测试
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '@/config/db/schema';
import { nanoid } from 'nanoid';

const DATABASE_URL = 'postgresql://neondb_owner:npg_au5XJdonk1Es@ep-mute-smoke-ainrvel2-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

const client = postgres(DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10 });
const db = drizzle({ client });

async function quickAddWebsite() {
  const testEmail = 'xiongjp_fr@hotmail.com';
  
  try {
    console.log('🔍 查找用户...');
    const users = await db.select().from(schema.user).where(eq(schema.user.email, testEmail)).limit(1);
    
    if (users.length === 0) {
      console.log('❌ 用户不存在');
      return;
    }
    
    const userId = users[0].id;
    console.log(`✅ 找到用户: ${users[0].email} (${users[0].planType})`);
    
    console.log('\n🌐 添加网站...');
    const siteId = `site_${Date.now()}_${nanoid(8)}`;
    
    const newSite = await db.insert(schema.monitoredSites).values({
      id: siteId,
      userId: userId,
      name: 'Digital Heirloom',
      domain: 'www.digitalheirloom.app',
      url: 'https://www.digitalheirloom.app',
      logoUrl: null,
      platform: 'creem',
      apiConfig: { platforms: { creem: { enabled: true }, uptime: { enabled: true } } },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    console.log(`✅ 网站添加成功: ${newSite[0].name}`);
    console.log(`   ID: ${siteId}`);
    
    console.log('\n📊 添加监控数据...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await db.insert(schema.siteMetricsDaily).values({
      id: `metrics_${Date.now()}`,
      siteId: siteId,
      date: today,
      revenue: 1990,
      visitors: 150,
      uptimePercentage: 100,
      responseTime: 250,
      createdAt: new Date(),
    });
    
    console.log('✅ 监控数据添加成功');
    console.log('   收入: $19.90');
    console.log('   访客: 150');
    
    console.log('\n🎉 完成！');
    console.log(`\n访问: https://soloboard-command-center-b.vercel.app/soloboard`);
    
  } catch (error: any) {
    console.error('❌ 错误:', error.message);
  } finally {
    await client.end();
  }
}

quickAddWebsite();

