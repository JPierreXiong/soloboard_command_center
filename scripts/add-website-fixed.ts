/**
 * 修复版：使用正确的表结构添加网站
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DATABASE_URL = 'postgresql://neondb_owner:npg_au5XJdonk1Es@ep-mute-smoke-ainrvel2-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

const client = postgres(DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10 });
const db = drizzle({ client });

async function addWebsiteFixed() {
  const testEmail = 'xiongjp_fr@hotmail.com';
  const websiteUrl = 'https://www.digitalheirloom.app';
  const websiteName = 'Digital Heirloom';
  
  try {
    console.log('🚀 开始添加网站测试\n');
    
    // 步骤 1: 查找用户
    console.log('👤 步骤 1: 查找用户...');
    const users = await client`
      SELECT id, email, plan_type FROM "user" WHERE email = ${testEmail} LIMIT 1
    `;
    
    if (users.length === 0) {
      console.log('❌ 用户不存在');
      return;
    }
    
    const userId = users[0].id;
    console.log(`   ✅ 找到用户: ${users[0].email} (${users[0].plan_type})`);
    
    // 步骤 2: 检查现有网站
    console.log('\n🌐 步骤 2: 检查现有网站...');
    const existingSites = await client`
      SELECT id, name, url FROM monitored_sites WHERE user_id = ${userId}
    `;
    
    console.log(`   当前网站数量: ${existingSites.length}`);
    
    const digitalHeirloom = existingSites.find((s: any) => 
      s.url?.includes('digitalheirloom')
    );
    
    let siteId: string;
    if (digitalHeirloom) {
      siteId = digitalHeirloom.id;
      console.log(`   ✅ 网站已存在: ${digitalHeirloom.name}`);
    } else {
      // 步骤 3: 添加新网站
      console.log('\n➕ 步骤 3: 添加新网站...');
      siteId = `site_${Date.now()}_${nanoid(8)}`;
      
      const now = new Date().toISOString();
      await client`
        INSERT INTO monitored_sites (
          id, user_id, name, url, platform, encrypted_config,
          status, display_order, created_at, updated_at, logo_url
        ) VALUES (
          ${siteId},
          ${userId},
          ${websiteName},
          ${websiteUrl},
          ${'CREEM'},
          ${'{}'},
          ${'active'},
          ${0},
          ${now},
          ${now},
          ${null}
        )
      `;
      
      console.log(`   ✅ 网站添加成功: ${websiteName}`);
      console.log(`      ID: ${siteId}`);
      console.log(`      URL: ${websiteUrl}`);
    }
    
    // 步骤 4: 检查是否有 site_metrics_daily 表
    console.log('\n📊 步骤 4: 检查监控数据表...');
    const tables = await client`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%metric%'
    `;
    
    console.log('   可用的表:');
    tables.forEach((t: any) => console.log(`      - ${t.table_name}`));
    
    // 如果有 site_metrics_daily 表，添加数据
    if (tables.some((t: any) => t.table_name === 'site_metrics_daily')) {
      console.log('\n📈 步骤 5: 添加监控数据...');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingMetrics = await client`
        SELECT id FROM site_metrics_daily 
        WHERE site_id = ${siteId} AND date = ${today}
        LIMIT 1
      `;
      
      if (existingMetrics.length === 0) {
        const nowStr = new Date().toISOString();
        const todayStr = today.toISOString();
        await client`
          INSERT INTO site_metrics_daily (
            id, site_id, date, revenue, visitors, 
            uptime_percentage, response_time, created_at
          ) VALUES (
            ${'metrics_' + Date.now()},
            ${siteId},
            ${todayStr},
            ${1990},
            ${150},
            ${100},
            ${250},
            ${nowStr}
          )
        `;
        
        console.log('   ✅ 监控数据添加成功:');
        console.log('      收入: $19.90');
        console.log('      访客: 150');
        console.log('      正常运行时间: 100%');
      } else {
        console.log('   ✅ 今日监控数据已存在');
      }
    } else {
      console.log('   ⚠️  site_metrics_daily 表不存在，跳过监控数据');
    }
    
    // 验证
    console.log('\n🔍 步骤 6: 验证数据...');
    const allSites = await client`
      SELECT id, name, url, status FROM monitored_sites WHERE user_id = ${userId}
    `;
    
    console.log(`   ✅ 用户网站总数: ${allSites.length}`);
    allSites.forEach((site: any, idx: number) => {
      console.log(`      ${idx + 1}. ${site.name} (${site.url})`);
    });
    
    // 总结
    console.log('\n' + '='.repeat(60));
    console.log('🎉 测试完成！');
    console.log('='.repeat(60));
    console.log('\n📋 结果:');
    console.log(`   用户: ${testEmail}`);
    console.log(`   网站: ${websiteName}`);
    console.log(`   网站 ID: ${siteId}`);
    console.log(`   总网站数: ${allSites.length}`);
    
    console.log('\n🌐 访问链接:');
    console.log(`   Dashboard: https://soloboard-command-center-b.vercel.app/soloboard`);
    console.log(`   网站详情: https://soloboard-command-center-b.vercel.app/soloboard/${siteId}`);
    
    console.log('\n💡 下一步:');
    console.log('   1. 在 Vercel 添加环境变量 DATABASE_PROVIDER=postgresql');
    console.log('   2. 重新部署应用');
    console.log('   3. 使用邮箱登录: xiongjp_fr@hotmail.com');
    console.log('   4. 访问 SoloBoard 查看网站');
    
  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error);
  } finally {
    await client.end();
    console.log('\n👋 完成');
  }
}

addWebsiteFixed();

