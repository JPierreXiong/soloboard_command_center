/**
 * Supabase Edge Function: Dead Man Switch Check
 * 
 * ⚠️ 当前实现状态：仅完成预警阶段（约 50%）
 * 
 * 已实现功能：
 * 1. ✅ 扫描所有达到触发时间的保险箱
 * 2. ✅ 将状态从 'active' 更新为 'warning'
 * 3. ✅ 发送多语言预警邮件给用户
 * 
 * ❌ 缺失功能（待实现）：
 * 1. ❌ 宽限期检测逻辑 - 检查 'warning' 状态的保险箱是否超过宽限期
 * 2. ❌ 资产释放逻辑 - 自动将状态更新为 'released'，通知受益人
 * 3. ❌ ShipAny API 集成 - 在资产释放时自动创建物理资产物流订单
 * 4. ❌ 受益人通知邮件 - 资产释放后发送通知给受益人
 * 5. ❌ 多次预警邮件 - 预警期内定期提醒（如每周一次）
 * 
 * 部署方式：
 * supabase functions deploy dead-man-check
 * 
 * 定时任务配置（在 Supabase Dashboard）：
 * SELECT cron.schedule(
 *   'dead-man-check-daily',
 *   '0 0 * * *',  -- 每天 UTC 0:00 执行
 *   $$ SELECT net.http_post(
 *     url := 'https://your-project.supabase.co/functions/v1/dead-man-check',
 *     headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
 *   ) $$
 * );
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 多语言邮件模板
const emailTemplates = {
  zh: {
    subject: '安全预警：我们需要确认您的状态',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⚠️ 安全预警</h2>
        <p>尊敬的用户，</p>
        <p>由于长时间未检测到您的活动，您的数字保险箱已进入预警期。</p>
        <p><strong>请在 7 天内登录系统以取消预警。</strong></p>
        <p>如果您不采取行动，您的数字资产将在宽限期结束后自动释放给指定的受益人。</p>
        <div style="margin: 30px 0;">
          <a href="https://afterglow.app/dashboard" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            我仍然活跃，立即登录
          </a>
        </div>
        <p style="color: #6b7280; font-size: 12px;">
          如果您已忘记密码，请使用恢复包中的助记词恢复访问。
        </p>
      </div>
    `,
  },
  en: {
    subject: 'Security Alert: Action Required',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⚠️ Security Alert</h2>
        <p>Dear User,</p>
        <p>We haven't seen you for a while. Your digital vault is in the grace period.</p>
        <p><strong>Please log in within 7 days to reset the alert.</strong></p>
        <p>If you don't take action, your digital assets will be automatically released to your designated beneficiaries after the grace period.</p>
        <div style="margin: 30px 0;">
          <a href="https://afterglow.app/dashboard" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            I'm Still Active - Log In Now
          </a>
        </div>
        <p style="color: #6b7280; font-size: 12px;">
          If you've forgotten your password, please use the mnemonic from your recovery kit.
        </p>
      </div>
    `,
  },
  fr: {
    subject: 'Alerte de sécurité : Action requise',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⚠️ Alerte de sécurité</h2>
        <p>Cher utilisateur,</p>
        <p>Nous n'avons pas détecté d'activité récente. Votre coffre numérique est en période de grâce.</p>
        <p><strong>Veuillez vous connecter dans les 7 jours pour réinitialiser l'alerte.</strong></p>
        <p>Si vous ne prenez pas de mesures, vos actifs numériques seront automatiquement libérés à vos bénéficiaires désignés après la période de grâce.</p>
        <div style="margin: 30px 0;">
          <a href="https://afterglow.app/dashboard" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Je suis toujours actif - Se connecter maintenant
          </a>
        </div>
        <p style="color: #6b7280; font-size: 12px;">
          Si vous avez oublié votre mot de passe, veuillez utiliser le mnémonique de votre kit de récupération.
        </p>
      </div>
    `,
  },
};

// 受益人通知邮件模板
const beneficiaryEmailTemplates = {
  zh: {
    subject: '数字遗产解锁通知',
    body: (beneficiaryName: string, releaseToken: string, trackingNumber?: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">数字遗产解锁通知</h2>
        <p>尊敬的 ${beneficiaryName}，</p>
        <p>您被指定为数字遗产的受益人。资产现已解锁，您可以访问以下链接查看详情：</p>
        <div style="margin: 30px 0;">
          <a href="https://afterglow.app/digital-heirloom/receive?token=${releaseToken}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            查看数字遗产
          </a>
        </div>
        ${trackingNumber ? `
        <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 6px;">
          <p><strong>物流追踪号：</strong>${trackingNumber}</p>
          <p style="font-size: 12px; color: #6b7280;">物理资产已寄出，请使用追踪号查询物流状态。</p>
        </div>
        ` : ''}
        <p style="color: #6b7280; font-size: 12px;">
          此链接将在 30 天后过期。请妥善保管您的释放令牌。
        </p>
      </div>
    `,
  },
  en: {
    subject: 'Digital Legacy Unlocked',
    body: (beneficiaryName: string, releaseToken: string, trackingNumber?: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Digital Legacy Unlocked</h2>
        <p>Dear ${beneficiaryName},</p>
        <p>You have been designated as a beneficiary of a digital legacy. The assets are now unlocked. You can access them using the link below:</p>
        <div style="margin: 30px 0;">
          <a href="https://afterglow.app/digital-heirloom/receive?token=${releaseToken}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
             View Digital Legacy
          </a>
        </div>
        ${trackingNumber ? `
        <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 6px;">
          <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
          <p style="font-size: 12px; color: #6b7280;">Physical asset has been shipped. Please use the tracking number to check shipping status.</p>
        </div>
        ` : ''}
        <p style="color: #6b7280; font-size: 12px;">
          This link will expire in 30 days. Please keep your release token safe.
        </p>
      </div>
    `,
  },
  fr: {
    subject: 'Héritage numérique déverrouillé',
    body: (beneficiaryName: string, releaseToken: string, trackingNumber?: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Héritage numérique déverrouillé</h2>
        <p>Cher ${beneficiaryName},</p>
        <p>Vous avez été désigné comme bénéficiaire d'un héritage numérique. Les actifs sont maintenant déverrouillés. Vous pouvez y accéder via le lien ci-dessous :</p>
        <div style="margin: 30px 0;">
          <a href="https://afterglow.app/digital-heirloom/receive?token=${releaseToken}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
             Voir l'héritage numérique
          </a>
        </div>
        ${trackingNumber ? `
        <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 6px;">
          <p><strong>Numéro de suivi :</strong> ${trackingNumber}</p>
          <p style="font-size: 12px; color: #6b7280;">L'actif physique a été expédié. Veuillez utiliser le numéro de suivi pour vérifier le statut d'expédition.</p>
        </div>
        ` : ''}
        <p style="color: #6b7280; font-size: 12px;">
          Ce lien expirera dans 30 jours. Veuillez conserver votre jeton de libération en sécurité.
        </p>
      </div>
    `,
  },
};

/**
 * 发送受益人通知邮件
 */
async function sendBeneficiaryNotificationEmail(
  beneficiary: any,
  releaseToken: string,
  vault: any,
  resendApiKey: string,
  trackingNumber?: string
) {
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured, skipping beneficiary email');
    return;
  }

  const language = beneficiary.language || 'en';
  const template = beneficiaryEmailTemplates[language as keyof typeof beneficiaryEmailTemplates] || beneficiaryEmailTemplates.en;

  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Afterglow Security <security@afterglow.app>',
        to: [beneficiary.email],
        subject: template.subject,
        html: template.body(beneficiary.name, releaseToken, trackingNumber),
      }),
    });

    const emailResult = await emailResponse.json();
    if (!emailResponse.ok) {
      console.error(`Failed to send beneficiary email to ${beneficiary.email}:`, emailResult);
    } else {
      console.log(`Beneficiary notification email sent to ${beneficiary.email}`);
    }
  } catch (error) {
    console.error(`Email sending error for ${beneficiary.email}:`, error);
  }
}

/**
 * 在 Edge Function 中调用 ShipAny API 创建物流订单
 * 注意：Edge Function 使用 Deno，需要直接使用 fetch API
 * 注意：不改变 ShipAny 结构，仅作为调用封装
 */
async function createShipAnyOrderInEdgeFunction(
  beneficiary: any,
  assetDescription: string,
  shipAnyApiKey: string,
  shipAnyApiUrl: string = 'https://api.shipany.io/v1',
  supabase?: any,
  vaultId?: string
): Promise<{ trackingNumber?: string; orderId?: string; error?: string; response?: any }> {
  // 开发环境：使用 Mock 模式
  if (isDevelopment) {
    console.log(`[Mock] Creating ShipAny order for beneficiary ${beneficiary.id}`);
    const mockResponse = {
      order_id: `MOCK-${Date.now()}`,
      tracking_number: `MOCK-TRACK-${Date.now()}`,
      status: 'created',
    };
    
    // 记录 Mock 操作日志
    if (supabase && vaultId) {
      await logServiceAction(
        supabase,
        vaultId,
        'shipany_api_call',
        { beneficiary_id: beneficiary.id, mode: 'mock' },
        beneficiary.id,
        'system',
        undefined,
        mockResponse
      );
    }
    
    return {
      trackingNumber: mockResponse.tracking_number,
      orderId: mockResponse.order_id,
      response: mockResponse,
    };
  }

  try {
    // 验证必填字段
    if (!beneficiary.receiver_name || !beneficiary.address_line1 || !beneficiary.city || 
        !beneficiary.zip_code || !beneficiary.country_code) {
      throw new Error('Incomplete recipient address information');
    }
    
    if (!beneficiary.phone) {
      throw new Error('Recipient phone number is required');
    }

    // 获取默认发件人信息（从环境变量）
    const senderName = Deno.env.get('SHIPANY_SENDER_NAME') || 'Digital Heirloom Vault';
    const senderPhone = Deno.env.get('SHIPANY_SENDER_PHONE') || '';
    const senderEmail = Deno.env.get('SHIPANY_SENDER_EMAIL') || 'noreply@afterglow.app';
    const senderAddressLine1 = Deno.env.get('SHIPANY_SENDER_ADDRESS_LINE1') || '';
    const senderCity = Deno.env.get('SHIPANY_SENDER_CITY') || 'Hong Kong';
    const senderZipCode = Deno.env.get('SHIPANY_SENDER_ZIP_CODE') || '';
    const senderCountryCode = Deno.env.get('SHIPANY_SENDER_COUNTRY_CODE') || 'HKG';

    // 构建 ShipAny API 请求载荷（严格按照 ShipAny API 文档结构）
    // 注意：不改变 ShipAny 结构，仅作为调用封装
    const payload = {
      courier_id: 'sf_express', // 默认使用顺丰，可根据需要调整
      type: 'prepaid',
      sender: {
        name: senderName,
        phone: senderPhone,
        email: senderEmail,
        address: {
          line1: senderAddressLine1,
          city: senderCity,
          zip_code: senderZipCode,
          country_code: senderCountryCode,
        },
      },
      receiver: {
        name: beneficiary.receiver_name,
        phone: beneficiary.phone,
        email: beneficiary.email,
        address: {
          line1: beneficiary.address_line1,
          city: beneficiary.city,
          zip_code: beneficiary.zip_code,
          country_code: beneficiary.country_code || 'HKG',
        },
      },
      parcels: [
        {
          weight: 0.5,
          container_type: 'BOX',
          content: assetDescription || beneficiary.physical_asset_description || 'Legacy Asset: Encrypted Recovery Kit',
        },
      ],
      customs_declaration: {
        currency: 'HKD',
        total_declared_value: 10.0,
      },
      insurance: true,
      reference_number: `HEIR-${Date.now()}-${beneficiary.id.substring(0, 8)}`,
    };

    // 调用 ShipAny API
    const response = await fetch(`${shipAnyApiUrl}/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${shipAnyApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`ShipAny API Error (${response.status}): ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    
    // 记录 ShipAny API 调用日志（不改变 ShipAny 结构，仅用于审计）
    if (supabase && vaultId) {
      await logServiceAction(
        supabase,
        vaultId,
        'shipany_api_call',
        {
          beneficiary_id: beneficiary.id,
          payload: payload,
          response_status: response.status,
        },
        beneficiary.id,
        'system',
        undefined,
        result // ShipAny 原始响应（不改变结构）
      );
    }
    
    return {
      trackingNumber: result.tracking_number || result.trackingNumber || result.tracking,
      orderId: result.order_id || result.id || result.orderId,
      response: result,
    };
  } catch (error) {
    console.error(`Failed to create ShipAny order for beneficiary ${beneficiary.id}:`, error);
    
    // 记录错误日志
    if (supabase && vaultId) {
      await logServiceAction(
        supabase,
        vaultId,
        'error',
        {
          beneficiary_id: beneficiary.id,
          error_type: 'shipany_api_call_failed',
        },
        beneficiary.id,
        'system',
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown error',
        error instanceof Error ? error.stack : undefined
      );
    }
    
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 资产释放函数
 * 将数字资产和物理资产释放给受益人
 */
async function releaseAssetsToBeneficiaries(
  vault: any,
  supabase: any,
  resendApiKey: string,
  shipAnyApiKey?: string,
  shipAnyApiUrl?: string
) {
  try {
    console.log(`Releasing assets for vault ${vault.id}`);

    // 状态锁：检查是否已经在处理中（防止重复处理）
    const { data: existingRelease } = await supabase
      .from('dead_man_switch_events')
      .select('id')
      .eq('vault_id', vault.id)
      .eq('event_type', 'assets_released')
      .limit(1)
      .single();

    if (existingRelease) {
      console.log(`Vault ${vault.id} already released, skipping`);
      return { skipped: true, reason: 'already_released' };
    }

    // 1. 获取所有受益人
    const { data: beneficiaries, error: benError } = await supabase
      .from('beneficiaries')
      .select('*')
      .eq('vault_id', vault.id)
      .eq('status', 'pending'); // 只处理未通知的受益人

    if (benError || !beneficiaries || beneficiaries.length === 0) {
      console.error(`No beneficiaries found for vault ${vault.id}`);
      return;
    }

    // 2. 获取用户信息（用于检查是否为 Pro 版）
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('plan_type, email')
      .eq('id', vault.user_id)
      .single();

    if (userError || !user) {
      console.error(`Failed to fetch user ${vault.user_id}:`, userError);
      return;
    }

    const isProUser = user.plan_type === 'pro' || user.plan_type === 'on_demand';

    // 3. 处理每个受益人
    const releaseResults = [];
    for (const beneficiary of beneficiaries) {
      let trackingNumber: string | undefined;
      let shipmentOrderId: string | undefined;

      // 3.1 检查是否有物理资产需要寄送（仅 Pro 版）
      if (isProUser && beneficiary.physical_asset_description) {
        // 检查是否有完整地址信息
        if (
          beneficiary.receiver_name &&
          beneficiary.address_line1 &&
          beneficiary.city &&
          beneficiary.zip_code &&
          beneficiary.country_code &&
          beneficiary.phone
        ) {
          // 状态锁：检查物流记录是否已存在（防止重复下单）
          const { data: existingShipping } = await supabase
            .from('shipping_logs')
            .select('id')
            .eq('beneficiary_id', beneficiary.id)
            .limit(1)
            .single();

          if (existingShipping) {
            console.log(`Shipping log already exists for beneficiary ${beneficiary.id}, skipping ShipAny API call`);
            // 获取现有的追踪号
            const { data: existingLog } = await supabase
              .from('shipping_logs')
              .select('tracking_number')
              .eq('beneficiary_id', beneficiary.id)
              .limit(1)
              .single();
            trackingNumber = existingLog?.tracking_number;
          } else {
            // 调用 ShipAny API 创建物流订单
            if (shipAnyApiKey) {
              const shipmentResult = await createShipAnyOrderInEdgeFunction(
                beneficiary,
                beneficiary.physical_asset_description,
                shipAnyApiKey,
                shipAnyApiUrl,
                supabase,
                vault.id
              );

            if (shipmentResult.trackingNumber && shipmentResult.orderId) {
              trackingNumber = shipmentResult.trackingNumber;
              shipmentOrderId = shipmentResult.orderId;

              // 创建物流记录（如果 shipping_logs 表存在）
              try {
                await supabase.from('shipping_logs').insert({
                  id: crypto.randomUUID(),
                  vault_id: vault.id,
                  beneficiary_id: beneficiary.id,
                  receiver_name: beneficiary.receiver_name,
                  receiver_phone: beneficiary.phone,
                  address_line1: beneficiary.address_line1,
                  city: beneficiary.city,
                  zip_code: beneficiary.zip_code,
                  country_code: beneficiary.country_code,
                  status: 'pending_review',
                  tracking_number: trackingNumber,
                  carrier: 'sf_express', // 默认承运商
                  created_at: new Date().toISOString(),
                });
                console.log(`Shipping log created for beneficiary ${beneficiary.id}`);
                
                // 记录物流创建日志
                await logServiceAction(
                  supabase,
                  vault.id,
                  'asset_release',
                  {
                    beneficiary_id: beneficiary.id,
                    tracking_number: trackingNumber,
                    shipment_order_id: shipmentOrderId,
                  },
                  beneficiary.id
                );
              } catch (shippingLogError) {
                console.error(`Failed to create shipping log:`, shippingLogError);
                // 记录错误日志
                await logServiceAction(
                  supabase,
                  vault.id,
                  'error',
                  {
                    beneficiary_id: beneficiary.id,
                    error_type: 'shipping_log_creation_failed',
                  },
                  beneficiary.id,
                  'system',
                  undefined,
                  undefined,
                  shippingLogError instanceof Error ? shippingLogError.message : 'Unknown error'
                );
                // 不阻断流程，继续处理
              }
            } else {
              console.warn(`ShipAny order creation failed for beneficiary ${beneficiary.id}: ${shipmentResult.error}`);
            }
          }
          } else {
            console.warn('SHIPANY_API_KEY not configured, skipping physical asset shipment');
          }
        } else {
          console.warn(`Beneficiary ${beneficiary.id} has physical asset but incomplete address`);
        }
      }

      // 3.2 生成释放令牌
      const releaseToken = crypto.randomUUID();
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30); // 30 天有效期

      // 3.3 更新受益人状态和令牌
      const { error: updateError } = await supabase
        .from('beneficiaries')
        .update({
          status: 'notified',
          release_token: releaseToken,
          release_token_expires_at: tokenExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', beneficiary.id);

      if (updateError) {
        console.error(`Failed to update beneficiary ${beneficiary.id}:`, updateError);
        continue;
      }

      // 3.4 发送受益人通知邮件
      await sendBeneficiaryNotificationEmail(
        beneficiary,
        releaseToken,
        vault,
        resendApiKey,
        trackingNumber
      );

      releaseResults.push({
        beneficiaryId: beneficiary.id,
        email: beneficiary.email,
        trackingNumber,
        shipmentOrderId,
      });
    }

    // 4. 更新保险箱状态为 released
    await supabase
      .from('digital_vaults')
      .update({
        status: 'released',
        dead_man_switch_activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', vault.id);

    // 5. 记录资产释放事件
    await supabase.from('dead_man_switch_events').insert({
      id: crypto.randomUUID(),
      vault_id: vault.id,
      event_type: 'assets_released',
      event_data: JSON.stringify({
        released_at: new Date().toISOString(),
        beneficiaries_count: beneficiaries.length,
        has_physical_assets: beneficiaries.some((b: any) => b.physical_asset_description),
        release_results: releaseResults,
      }),
      created_at: new Date().toISOString(),
    });

    // 6. 记录资产释放操作日志
    await logServiceAction(
      supabase,
      vault.id,
      'asset_release',
      {
        beneficiaries_count: beneficiaries.length,
        release_results: releaseResults,
      }
    );

    console.log(`Assets released for vault ${vault.id}, ${beneficiaries.length} beneficiary(ies) notified`);
    return releaseResults;
  } catch (error) {
    console.error(`Error releasing assets for vault ${vault.id}:`, error);
    throw error;
  }
}

// 环境检测：开发环境使用 Mock 模式
const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development' || 
                      Deno.env.get('DENO_ENV') === 'development';

/**
 * 记录服务日志（用于审计）
 */
async function logServiceAction(
  supabase: any,
  vaultId: string,
  actionType: string,
  actionData: any,
  beneficiaryId?: string,
  actorId?: string,
  actorEmail?: string,
  shipanyResponse?: any,
  errorMessage?: string
) {
  try {
    await supabase.from('service_logs').insert({
      id: crypto.randomUUID(),
      vault_id: vaultId,
      beneficiary_id: beneficiaryId,
      action_type: actionType,
      actor_id: actorId || 'system',
      actor_email: actorEmail,
      action_data: actionData,
      shipany_response: shipanyResponse,
      error_message: errorMessage,
      result: errorMessage ? 'failed' : 'success',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log service action:', error);
    // 不阻断流程
  }
}

serve(async (req) => {
  try {
    // 初始化 Supabase 客户端（使用 Service Role 以绕过 RLS）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const shipAnyApiKey = Deno.env.get('SHIPANY_API_KEY'); // 可选
    const shipAnyApiUrl = Deno.env.get('SHIPANY_API_URL') || 'https://api.shipany.io/v1';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================
    // 阶段 1: 处理新过期的保险箱（预警阶段）
    // ============================================
    
    // 1. 调用 RPC 函数获取过期的保险箱
    const { data: expiredVaults, error: rpcError } = await supabase.rpc(
      'get_expired_vaults'
    );

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expired vaults', details: rpcError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const warningResults = [];
    if (expiredVaults && expiredVaults.length > 0) {
      console.log(`Found ${expiredVaults.length} expired vault(s) for warning phase`);

      // 2. 处理每个过期的保险箱（发送预警）
      for (const vault of expiredVaults) {
        try {
          // 2.1 更新状态为 'warning'
          const { error: updateError } = await supabase
            .from('digital_vaults')
            .update({
              status: 'warning',
              updated_at: new Date().toISOString(),
            })
            .eq('id', vault.id);

          if (updateError) {
            console.error(`Failed to update vault ${vault.id}:`, updateError);
            warningResults.push({ vaultId: vault.id, status: 'error', error: updateError.message });
            continue;
          }

          // 2.2 记录警告事件
          await supabase.from('dead_man_switch_events').insert({
            id: crypto.randomUUID(),
            vault_id: vault.id,
            event_type: 'warning_sent',
            event_data: JSON.stringify({
              triggered_at: new Date().toISOString(),
              heartbeat_frequency: vault.heartbeat_frequency,
              grace_period: vault.grace_period,
            }),
            created_at: new Date().toISOString(),
          });

          // 2.3 获取用户信息
          const { data: user, error: userError } = await supabase
            .from('user')
            .select('email, name')
            .eq('id', vault.user_id)
            .single();

          if (userError || !user) {
            console.error(`Failed to fetch user ${vault.user_id}:`, userError);
            warningResults.push({ vaultId: vault.id, status: 'error', error: 'User not found' });
            continue;
          }

          // 2.4 确定用户语言（从 beneficiaries 表或使用默认值）
          const { data: beneficiaries } = await supabase
            .from('beneficiaries')
            .select('language')
            .eq('vault_id', vault.id)
            .limit(1);

          const userLanguage = beneficiaries?.[0]?.language || 'en';
          const template = emailTemplates[userLanguage as keyof typeof emailTemplates] || emailTemplates.en;

          // 2.5 发送预警邮件（如果配置了 Resend）
          if (resendApiKey) {
            try {
              const emailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'Afterglow Security <security@afterglow.app>',
                  to: [user.email],
                  subject: template.subject,
                  html: template.body,
                }),
              });

              const emailResult = await emailResponse.json();
              if (!emailResponse.ok) {
                console.error(`Failed to send email to ${user.email}:`, emailResult);
              } else {
                console.log(`Warning email sent to ${user.email}`);
              }
            } catch (emailError) {
              console.error(`Email sending error for ${user.email}:`, emailError);
            }
          } else {
            console.warn('RESEND_API_KEY not configured, skipping email sending');
          }

          warningResults.push({
            vaultId: vault.id,
            userId: vault.user_id,
            status: 'warning_sent',
            email: user.email,
          });
        } catch (error) {
          console.error(`Error processing vault ${vault.id}:`, error);
          warningResults.push({
            vaultId: vault.id,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // ============================================
    // 阶段 2: 处理超过宽限期的保险箱（资产释放阶段）
    // ============================================

    // 3. 检查 warning 状态的保险箱是否超过宽限期
    const { data: warningVaults, error: warningError } = await supabase
      .from('digital_vaults')
      .select('*')
      .eq('status', 'warning')
      .eq('dead_man_switch_enabled', true);

    const releaseResults = [];
    if (!warningError && warningVaults && warningVaults.length > 0) {
      console.log(`Found ${warningVaults.length} warning vault(s) to check for grace period`);

      const now = new Date();

      for (const vault of warningVaults) {
        try {
          // 获取最后预警发送时间
          const { data: lastWarningEvent } = await supabase
            .from('dead_man_switch_events')
            .select('created_at')
            .eq('vault_id', vault.id)
            .eq('event_type', 'warning_sent')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!lastWarningEvent) {
            console.warn(`No warning event found for vault ${vault.id}, skipping`);
            continue;
          }

          const warningSentAt = new Date(lastWarningEvent.created_at);
          const gracePeriodDays = vault.grace_period || 7;
          const gracePeriodEndDate = new Date(
            warningSentAt.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000
          );

          // 如果超过宽限期，触发资产释放
          if (now >= gracePeriodEndDate) {
            console.log(`Vault ${vault.id} exceeded grace period, releasing assets`);
            const results = await releaseAssetsToBeneficiaries(
              vault,
              supabase,
              resendApiKey,
              shipAnyApiKey,
              shipAnyApiUrl
            );
            releaseResults.push({
              vaultId: vault.id,
              status: 'released',
              beneficiaries: results,
            });
          }
        } catch (error) {
          console.error(`Error processing warning vault ${vault.id}:`, error);
          releaseResults.push({
            vaultId: vault.id,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // 返回处理结果
    return new Response(
      JSON.stringify({
        message: 'Dead man switch check completed',
        warningPhase: {
          processed: warningResults.length,
          results: warningResults,
        },
        releasePhase: {
          processed: releaseResults.length,
          results: releaseResults,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    // 2. 处理每个过期的保险箱
    const results = [];
    for (const vault of expiredVaults) {
      try {
        // 2.1 更新状态为 'warning'
        const { error: updateError } = await supabase
          .from('digital_vaults')
          .update({
            status: 'warning',
            updated_at: new Date().toISOString(),
          })
          .eq('id', vault.id);

        if (updateError) {
          console.error(`Failed to update vault ${vault.id}:`, updateError);
          results.push({ vaultId: vault.id, status: 'error', error: updateError.message });
          continue;
        }

        // 2.2 记录警告事件
        await supabase.from('dead_man_switch_events').insert({
          id: crypto.randomUUID(),
          vault_id: vault.id,
          event_type: 'warning_sent',
          event_data: JSON.stringify({
            triggered_at: new Date().toISOString(),
            heartbeat_frequency: vault.heartbeat_frequency,
            grace_period: vault.grace_period,
          }),
          created_at: new Date().toISOString(),
        });

        // 2.3 获取用户信息
        const { data: user, error: userError } = await supabase
          .from('user')
          .select('email, name')
          .eq('id', vault.user_id)
          .single();

        if (userError || !user) {
          console.error(`Failed to fetch user ${vault.user_id}:`, userError);
          results.push({ vaultId: vault.id, status: 'error', error: 'User not found' });
          continue;
        }

        // 2.4 确定用户语言（从 beneficiaries 表或使用默认值）
        const { data: beneficiaries } = await supabase
          .from('beneficiaries')
          .select('language')
          .eq('vault_id', vault.id)
          .limit(1);

        const userLanguage = beneficiaries?.[0]?.language || 'en';
        const template = emailTemplates[userLanguage as keyof typeof emailTemplates] || emailTemplates.en;

        // 2.5 发送预警邮件（如果配置了 Resend）
        if (resendApiKey) {
          try {
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Afterglow Security <security@afterglow.app>',
                to: [user.email],
                subject: template.subject,
                html: template.body,
              }),
            });

            const emailResult = await emailResponse.json();
            if (!emailResponse.ok) {
              console.error(`Failed to send email to ${user.email}:`, emailResult);
            } else {
              console.log(`Warning email sent to ${user.email}`);
            }
          } catch (emailError) {
            console.error(`Email sending error for ${user.email}:`, emailError);
            // 不阻断流程，继续处理其他保险箱
          }
        } else {
          console.warn('RESEND_API_KEY not configured, skipping email sending');
        }

        results.push({
          vaultId: vault.id,
          userId: vault.user_id,
          status: 'warning_sent',
          email: user.email,
        });
      } catch (error) {
        console.error(`Error processing vault ${vault.id}:`, error);
        results.push({
          vaultId: vault.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Dead man switch check completed',
        processed: results.length,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});


