/**
 * 完整测试：创建用户 + 添加网站 + 监控数据
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '@/config/db/schema';
import { nanoid } from 'nanoid';

const DATABASE_URL = 'postgresql://neondb_owner:npg_au5XJdonk1Es@ep-mute-smoke-ainrvel2-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

const client = postgres(DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10 });
const db = drizzle({ client });

async function fullTest() {
  const testEmail = 'xiongjp_fr@hotmail.com';
  
  try {
    console.log('🚀 开始完整测试\n');
    
    // 步骤 1: 查找或创建用户
    console.log('👤 步骤 1: 查找用户...');
    let users = await db.select().from(schema.user).where(eq(schema.user.email, testEmail)).limit(1);
    
    let userId: string;
    if (users.length === 0) {
      console.log('   用户不存在，创建新用户...');
      userId = `user_${Date.now()}_${nanoid(8)}`;
      
      await db.insert(schema.user).values({
        id: userId,
        email: testEmail,
        name: 'Test User',
        emailVerified: false,
        planType: 'base',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      console.log(`   ✅ 用户创建成功: ${testEmail} (base plan)`);
    } else {
      userId = users[0].id;
      console.log(`   ✅ 找到用户: ${testEmail} (${users[0].planType})`);
    }
    
    // 步骤 2: 检查网站是否已存在
    console.log('\n🌐 步骤 2: 检查现有网站...');
    const existingSites = await db.select()
      .from(schema.monitoredSites)
      .where(eq(schema.monitoredSites.userId, userId));
    
    console.log(`   当前网站数量: ${existingSites.length}`);
    
    const digitalHeirloom = existingSites.find(s => 
      s.domain?.includes('digitalheirloom') || s.url?.includes('digitalheirloom')
    );
    
    let siteId: string;
    if (digitalHeirloom) {
      siteId = digitalHeirloom.id;
      console.log(`   ✅ 网站已存在: ${digitalHeirloom.name}`);
    } else {
      // 步骤 3: 添加新网站
      console.log('\n➕ 步骤 3: 添加新网站...');
      siteId = `site_${Date.now()}_${nanoid(8)}`;
      
      await db.insert(schema.monitoredSites).values({
        id: siteId,
        userId: userId,
        name: 'Digital Heirloom',
        domain: 'www.digitalheirloom.app',
        url: 'https://www.digitalheirloom.app',
        logoUrl: null,
        platform: 'creem',
        apiConfig: { 
          platforms: { 
            creem: { enabled: true },
            uptime: { enabled: true }
          } 
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      console.log(`   ✅ 网站添加成功: Digital Heirloom`);
      console.log(`      ID: ${siteId}`);
      console.log(`      URL: https://www.digitalheirloom.app`);
    }
    
    // 步骤 4: 添加今日监控数据
    console.log('\n📊 步骤 4: 添加监控数据...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingMetrics = await db.select()
      .from(schema.siteMetricsDaily)
      .where(eq(schema.siteMetricsDaily.siteId, siteId))
      .limit(1);
    
    if (existingMetrics.length === 0) {
      await db.insert(schema.siteMetricsDaily).values({
        id: `metrics_${Date.now()}`,
        siteId: siteId,
        date: today,
        revenue: 1990, // $19.90
        visitors: 150,
        uptimePercentage: 100,
        responseTime: 250,
        createdAt: new Date(),
      });
      
      console.log('   ✅ 今日数据添加成功:');
      console.log('      收入: $19.90');
      console.log('      访客: 150');
      console.log('      正常运行时间: 100%');
      console.log('      响应时间: 250ms');
    } else {
      console.log('   ✅ 今日数据已存在');
    }
    
    // 步骤 5: 验证数据
    console.log('\n🔍 步骤 5: 验证数据...');
    const allSites = await db.select()
      .from(schema.monitoredSites)
      .where(eq(schema.monitoredSites.userId, userId));
    
    const allMetrics = await db.select()
      .from(schema.siteMetricsDaily)
      .where(eq(schema.siteMetricsDaily.siteId, siteId));
    
    console.log(`   ✅ 用户网站总数: ${allSites.length}`);
    console.log(`   ✅ 监控数据点: ${allMetrics.length}`);
    
    // 总结
    console.log('\n' + '='.repeat(60));
    console.log('🎉 测试完成！');
    console.log('='.repeat(60));
    console.log('\n📋 结果:');
    console.log(`   用户: ${testEmail}`);
    console.log(`   网站: Digital Heirloom`);
    console.log(`   网站 ID: ${siteId}`);
    console.log(`   监控数据: ${allMetrics.length} 个数据点`);
    
    console.log('\n🌐 访问链接:');
    console.log(`   Dashboard: https://soloboard-command-center-b.vercel.app/soloboard`);
    console.log(`   网站详情: https://soloboard-command-center-b.vercel.app/soloboard/${siteId}`);
    
    console.log('\n💡 提示:');
    console.log('   1. 使用邮箱登录: xiongjp_fr@hotmail.com');
    console.log('   2. 查看 SoloBoard 页面');
    console.log('   3. 应该能看到 Digital Heirloom 网站');
    console.log('   4. 点击查看详细监控数据');
    
  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error);
  } finally {
    await client.end();
    console.log('\n👋 完成');
  }
}

fullTest();

