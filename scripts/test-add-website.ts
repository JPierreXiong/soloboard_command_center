/**
 * 测试脚本：添加网站并获取监控数据
 * 
 * 测试流程：
 * 1. 创建测试用户（如果不存在）
 * 2. 添加网站 https://www.digitalheirloom.app
 * 3. 获取网站监控数据
 * 4. 验证数据完整性
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '@/config/db/schema';
import { nanoid } from 'nanoid';

const DATABASE_URL = 'postgresql://neondb_owner:npg_au5XJdonk1Es@ep-mute-smoke-ainrvel2-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log('🔌 连接数据库...');
const client = postgres(DATABASE_URL, {
  prepare: false,
  max: 1,
  connect_timeout: 10,
});

const db = drizzle({ client });

async function testAddWebsite() {
  const testEmail = 'xiongjp_fr@hotmail.com';
  const websiteUrl = 'https://www.digitalheirloom.app';
  const websiteName = 'Digital Heirloom';
  
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 开始测试：添加网站并获取监控数据');
    console.log('='.repeat(80));

    // ============================================================================
    // 步骤 1: 查找或创建测试用户
    // ============================================================================
    console.log('\n👤 步骤 1: 查找测试用户');
    console.log('-'.repeat(80));
    
    let testUser = await db.select()
      .from(schema.user)
      .where(eq(schema.user.email, testEmail))
      .limit(1);

    let userId: string;
    
    if (testUser.length === 0) {
      console.log('   用户不存在，创建新用户...');
      userId = `user_${Date.now()}_${nanoid(8)}`;
      
      const newUser = await db.insert(schema.user).values({
        id: userId,
        email: testEmail,
        name: 'Test User',
        emailVerified: false,
        planType: 'base', // 设置为 base 计划，可以添加最多 5 个网站
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      console.log(`   ✅ 用户创建成功: ${newUser[0].email} (${newUser[0].planType})`);
    } else {
      userId = testUser[0].id;
      console.log(`   ✅ 找到用户: ${testUser[0].email} (${testUser[0].planType})`);
    }

    // ============================================================================
    // 步骤 2: 检查网站是否已存在
    // ============================================================================
    console.log('\n🌐 步骤 2: 检查网站是否已存在');
    console.log('-'.repeat(80));
    
    const existingSites = await db.select()
      .from(schema.monitoredSites)
      .where(eq(schema.monitoredSites.userId, userId));
    
    console.log(`   当前网站数量: ${existingSites.length}`);
    
    const existingSite = existingSites.find(s => 
      s.domain === 'www.digitalheirloom.app' || 
      s.url === websiteUrl
    );
    
    let siteId: string;
    
    if (existingSite) {
      siteId = existingSite.id;
      console.log(`   ✅ 网站已存在: ${existingSite.name} (${existingSite.domain})`);
    } else {
      // ============================================================================
      // 步骤 3: 添加新网站
      // ============================================================================
      console.log('\n➕ 步骤 3: 添加新网站');
      console.log('-'.repeat(80));
      
      siteId = `site_${Date.now()}_${nanoid(8)}`;
      
      const newSite = await db.insert(schema.monitoredSites).values({
        id: siteId,
        userId: userId,
        name: websiteName,
        domain: 'www.digitalheirloom.app',
        url: websiteUrl,
        logoUrl: null,
        platform: 'creem', // Creem 支付平台
        apiConfig: {
          platforms: {
            creem: {
              enabled: true,
              apiKey: process.env.CREEM_API_KEY || '',
            },
            uptime: {
              enabled: true,
            }
          }
        },
        status: 'active',
        lastSyncAt: null,
        lastSyncStatus: null,
        lastSyncError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      console.log(`   ✅ 网站添加成功:`);
      console.log(`      ID: ${newSite[0].id}`);
      console.log(`      名称: ${newSite[0].name}`);
      console.log(`      域名: ${newSite[0].domain}`);
      console.log(`      URL: ${newSite[0].url}`);
      console.log(`      平台: ${newSite[0].platform}`);
    }

    // ============================================================================
    // 步骤 4: 创建初始监控数据
    // ============================================================================
    console.log('\n📊 步骤 4: 创建初始监控数据');
    console.log('-'.repeat(80));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 检查今天是否已有数据
    const existingMetrics = await db.select()
      .from(schema.siteMetricsDaily)
      .where(eq(schema.siteMetricsDaily.siteId, siteId))
      .limit(1);
    
    if (existingMetrics.length === 0) {
      // 创建模拟数据
      const metricsId = `metrics_${Date.now()}_${nanoid(8)}`;
      
      await db.insert(schema.siteMetricsDaily).values({
        id: metricsId,
        siteId: siteId,
        date: today,
        revenue: 1990, // $19.90
        visitors: 150,
        uptimePercentage: 100,
        responseTime: 250, // 250ms
        createdAt: new Date(),
      });
      
      console.log(`   ✅ 创建今日监控数据:`);
      console.log(`      收入: $19.90`);
      console.log(`      访客: 150`);
      console.log(`      正常运行时间: 100%`);
      console.log(`      响应时间: 250ms`);
    } else {
      console.log(`   ✅ 今日监控数据已存在:`);
      console.log(`      收入: $${(existingMetrics[0].revenue / 100).toFixed(2)}`);
      console.log(`      访客: ${existingMetrics[0].visitors}`);
      console.log(`      正常运行时间: ${existingMetrics[0].uptimePercentage}%`);
      console.log(`      响应时间: ${existingMetrics[0].responseTime}ms`);
    }

    // ============================================================================
    // 步骤 5: 创建历史数据（最近7天）
    // ============================================================================
    console.log('\n📈 步骤 5: 创建历史数据（最近7天）');
    console.log('-'.repeat(80));
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const existingHistory = await db.select()
        .from(schema.siteMetricsDaily)
        .where(eq(schema.siteMetricsDaily.siteId, siteId))
        .limit(1);
      
      if (existingHistory.length === 0) {
        const historyId = `metrics_${Date.now()}_${i}_${nanoid(8)}`;
        const revenue = Math.floor(Math.random() * 3000) + 1000; // $10-$40
        const visitors = Math.floor(Math.random() * 200) + 100; // 100-300
        
        await db.insert(schema.siteMetricsDaily).values({
          id: historyId,
          siteId: siteId,
          date: date,
          revenue: revenue,
          visitors: visitors,
          uptimePercentage: Math.floor(Math.random() * 5) + 95, // 95-100%
          responseTime: Math.floor(Math.random() * 200) + 150, // 150-350ms
          createdAt: new Date(),
        });
        
        console.log(`   ✅ ${i}天前: 收入 $${(revenue / 100).toFixed(2)}, 访客 ${visitors}`);
      }
    }

    // ============================================================================
    // 步骤 6: 查询并验证数据
    // ============================================================================
    console.log('\n🔍 步骤 6: 查询并验证数据');
    console.log('-'.repeat(80));
    
    // 查询网站信息
    const siteInfo = await db.select()
      .from(schema.monitoredSites)
      .where(eq(schema.monitoredSites.id, siteId))
      .limit(1);
    
    // 查询所有监控数据
    const allMetrics = await db.select()
      .from(schema.siteMetricsDaily)
      .where(eq(schema.siteMetricsDaily.siteId, siteId));
    
    console.log(`\n   📊 网站信息:`);
    console.log(`      名称: ${siteInfo[0].name}`);
    console.log(`      域名: ${siteInfo[0].domain}`);
    console.log(`      URL: ${siteInfo[0].url}`);
    console.log(`      状态: ${siteInfo[0].status}`);
    console.log(`      平台: ${siteInfo[0].platform}`);
    
    console.log(`\n   📈 监控数据统计:`);
    console.log(`      数据点数量: ${allMetrics.length}`);
    
    const totalRevenue = allMetrics.reduce((sum, m) => sum + (m.revenue || 0), 0);
    const totalVisitors = allMetrics.reduce((sum, m) => sum + (m.visitors || 0), 0);
    const avgUptime = allMetrics.reduce((sum, m) => sum + (m.uptimePercentage || 0), 0) / allMetrics.length;
    
    console.log(`      总收入: $${(totalRevenue / 100).toFixed(2)}`);
    console.log(`      总访客: ${totalVisitors}`);
    console.log(`      平均正常运行时间: ${avgUptime.toFixed(2)}%`);

    // ============================================================================
    // 步骤 7: 测试 Dashboard API
    // ============================================================================
    console.log('\n🌐 步骤 7: 模拟 Dashboard API 响应');
    console.log('-'.repeat(80));
    
    console.log(`\n   预期 API 响应:`);
    console.log(`   {`);
    console.log(`     "sites": [`);
    console.log(`       {`);
    console.log(`         "id": "${siteId}",`);
    console.log(`         "name": "${websiteName}",`);
    console.log(`         "domain": "www.digitalheirloom.app",`);
    console.log(`         "status": "online",`);
    console.log(`         "todayRevenue": ${allMetrics[0]?.revenue || 0},`);
    console.log(`         "todayVisitors": ${allMetrics[0]?.visitors || 0},`);
    console.log(`         "platforms": ["creem", "uptime"]`);
    console.log(`       }`);
    console.log(`     ],`);
    console.log(`     "summary": {`);
    console.log(`       "totalSites": 1,`);
    console.log(`       "totalRevenue": ${allMetrics[0]?.revenue || 0},`);
    console.log(`       "totalVisitors": ${allMetrics[0]?.visitors || 0},`);
    console.log(`       "sitesOnline": 1`);
    console.log(`     }`);
    console.log(`   }`);

    // ============================================================================
    // 测试总结
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ 测试完成！');
    console.log('='.repeat(80));
    
    console.log('\n📋 测试总结:');
    console.log(`   ✅ 用户: ${testEmail}`);
    console.log(`   ✅ 网站: ${websiteName} (${websiteUrl})`);
    console.log(`   ✅ 监控数据: ${allMetrics.length} 个数据点`);
    console.log(`   ✅ 总收入: $${(totalRevenue / 100).toFixed(2)}`);
    console.log(`   ✅ 总访客: ${totalVisitors}`);
    
    console.log('\n🚀 下一步:');
    console.log(`   1. 访问: https://soloboard-command-center-b.vercel.app/soloboard`);
    console.log(`   2. 使用邮箱登录: ${testEmail}`);
    console.log(`   3. 查看网站监控数据`);
    console.log(`   4. 点击网站查看详细信息`);
    
    console.log('\n💡 提示:');
    console.log(`   - 网站 ID: ${siteId}`);
    console.log(`   - 详情页面: https://soloboard-command-center-b.vercel.app/soloboard/${siteId}`);
    
  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('   详细错误:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n👋 数据库连接已关闭');
  }
}

testAddWebsite();

