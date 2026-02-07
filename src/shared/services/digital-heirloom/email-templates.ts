/**
 * Digital Heirloom 邮件模板
 * 支持英文、中文、法文
 */

export type EmailLanguage = 'en' | 'zh' | 'fr';

export interface HeartbeatWarningEmailData {
  userName: string;
  daysSinceLastSeen: number;
  heartbeatFrequency: number;
  gracePeriod: number;
  confirmLink: string;
  vaultId: string;
}

export interface HeartbeatReminderEmailData {
  userName: string;
  daysSinceLastSeen: number;
  hoursRemaining: number;
  confirmLink: string;
  vaultId: string;
}

export interface InheritanceNoticeEmailData {
  beneficiaryName: string;
  userName: string;
  releaseToken: string;
  unlockLink: string;
  shippingTrackingNumber?: string;
  shippingCarrier?: string;
}

/**
 * 获取一级预警邮件模板
 */
export function getHeartbeatWarningEmailTemplate(
  data: HeartbeatWarningEmailData,
  language: EmailLanguage = 'en'
): { subject: string; html: string } {
  const templates = {
    en: {
      subject: '[Digital Heirloom] Security Check Required: Your Digital Vault Active Status',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .button { display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Digital Heirloom</h1>
    </div>
    <div class="content">
      <h2>Security Check Required</h2>
      <p>Dear ${data.userName},</p>
      <p>This is an automated security check from <strong>DigitalHeirloom.app</strong>.</p>
      <p>It has been <strong>${data.daysSinceLastSeen} days</strong> since your last check-in. According to your settings, your heartbeat monitoring period is <strong>${data.heartbeatFrequency} days</strong>.</p>
      
      <div class="warning">
        <strong>⚠️ Action Required:</strong> To prevent the accidental triggering of your inheritance protocol, please confirm you are active by clicking the button below.
      </div>
      
      <div style="text-align: center;">
        <a href="${data.confirmLink}" class="button">I AM SECURE - CONFIRM NOW</a>
      </div>
      
      <p><strong>Important:</strong> If no action is taken within <strong>${data.gracePeriod} days</strong>, your designated beneficiaries will be contacted as per your "Dead Man's Switch" settings.</p>
      
      <p>If you did not expect this email, please contact our support team immediately.</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>© 2025 Digital Heirloom. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
    },
    zh: {
      subject: '[数字遗产] 安全确认：您的数字金库活跃状态检测',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .button { display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>数字遗产</h1>
    </div>
    <div class="content">
      <h2>安全确认提醒</h2>
      <p>尊敬的 ${data.userName}，</p>
      <p>这是来自 <strong>DigitalHeirloom.app</strong> 的自动化安全提醒。</p>
      <p>距离您上次活跃已过去 <strong>${data.daysSinceLastSeen} 天</strong>。根据您的设置，您的心跳监测周期为 <strong>${data.heartbeatFrequency} 天</strong>。</p>
      
      <div class="warning">
        <strong>⚠️ 需要操作：</strong> 为防止意外触发遗产转交程序，请点击下方按钮确认您的安全状态。
      </div>
      
      <div style="text-align: center;">
        <a href="${data.confirmLink}" class="button">我仍安全 - 立即确认</a>
      </div>
      
      <p><strong>重要提示：</strong> 若在 <strong>${data.gracePeriod} 天</strong> 内未收到您的确认，系统将依照您的"死人开关"设定，启动遗产转交程序并联系您的受益人。</p>
      
      <p>如果您未预期收到此邮件，请立即联系我们的支持团队。</p>
    </div>
    <div class="footer">
      <p>这是一封自动发送的邮件，请勿回复。</p>
      <p>© 2025 Digital Heirloom. 保留所有权利。</p>
    </div>
  </div>
</body>
</html>
      `,
    },
    fr: {
      subject: '[Digital Heirloom] Vérification de sécurité requise : Statut actif de votre coffre-fort numérique',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .button { display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Digital Heirloom</h1>
    </div>
    <div class="content">
      <h2>Vérification de sécurité requise</h2>
      <p>Cher ${data.userName},</p>
      <p>Ceci est une vérification de sécurité automatisée de <strong>DigitalHeirloom.app</strong>.</p>
      <p>Cela fait <strong>${data.daysSinceLastSeen} jours</strong> depuis votre dernière connexion. Selon vos paramètres, votre période de surveillance du rythme cardiaque est de <strong>${data.heartbeatFrequency} jours</strong>.</p>
      
      <div class="warning">
        <strong>⚠️ Action requise :</strong> Pour éviter le déclenchement accidentel de votre protocole d'héritage, veuillez confirmer que vous êtes actif en cliquant sur le bouton ci-dessous.
      </div>
      
      <div style="text-align: center;">
        <a href="${data.confirmLink}" class="button">JE SUIS EN SÉCURITÉ - CONFIRMER MAINTENANT</a>
      </div>
      
      <p><strong>Important :</strong> Si aucune action n'est entreprise dans <strong>${data.gracePeriod} jours</strong>, vos bénéficiaires désignés seront contactés conformément à vos paramètres "Dead Man's Switch".</p>
      
      <p>Si vous n'avez pas attendu cet e-mail, veuillez contacter immédiatement notre équipe de support.</p>
    </div>
    <div class="footer">
      <p>Ceci est un message automatisé. Veuillez ne pas répondre à cet e-mail.</p>
      <p>© 2025 Digital Heirloom. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
      `,
    },
  };

  return templates[language] || templates.en;
}

/**
 * 获取二次提醒邮件模板（宽限期倒计时）
 */
export function getHeartbeatReminderEmailTemplate(
  data: HeartbeatReminderEmailData,
  language: EmailLanguage = 'en'
): { subject: string; html: string } {
  const templates = {
    en: {
      subject: '[Digital Heirloom] Final Reminder: Please confirm your status within 24 hours',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .button { display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .urgent { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Digital Heirloom</h1>
    </div>
    <div class="content">
      <h2>Final Reminder: 24 Hours Remaining</h2>
      <p>Dear ${data.userName},</p>
      <p>This is your <strong>final reminder</strong> from <strong>DigitalHeirloom.app</strong>.</p>
      <p>You have <strong>${data.hoursRemaining} hours</strong> remaining to confirm your active status before your inheritance protocol is automatically triggered.</p>
      
      <div class="urgent">
        <strong>🚨 URGENT:</strong> Please click the button below immediately to confirm you are safe and active.
      </div>
      
      <div style="text-align: center;">
        <a href="${data.confirmLink}" class="button">CONFIRM NOW - TIME IS RUNNING OUT</a>
      </div>
      
      <p>If you do not confirm within the next ${data.hoursRemaining} hours, your designated beneficiaries will be notified and your digital legacy will be transferred according to your settings.</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>© 2025 Digital Heirloom. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
    },
    zh: {
      subject: '[数字遗产] 最后提醒：请在24小时内确认您的安全状态',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .button { display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .urgent { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>数字遗产</h1>
    </div>
    <div class="content">
      <h2>最后提醒：剩余24小时</h2>
      <p>尊敬的 ${data.userName}，</p>
      <p>这是来自 <strong>DigitalHeirloom.app</strong> 的<strong>最后提醒</strong>。</p>
      <p>您还有 <strong>${data.hoursRemaining} 小时</strong> 来确认您的活跃状态，否则遗产转交程序将自动触发。</p>
      
      <div class="urgent">
        <strong>🚨 紧急：</strong> 请立即点击下方按钮确认您的安全状态。
      </div>
      
      <div style="text-align: center;">
        <a href="${data.confirmLink}" class="button">立即确认 - 时间紧迫</a>
      </div>
      
      <p>如果您在未来 ${data.hoursRemaining} 小时内未确认，您的受益人将被通知，数字遗产将根据您的设置进行转交。</p>
    </div>
    <div class="footer">
      <p>这是一封自动发送的邮件，请勿回复。</p>
      <p>© 2025 Digital Heirloom. 保留所有权利。</p>
    </div>
  </div>
</body>
</html>
      `,
    },
    fr: {
      subject: '[Digital Heirloom] Dernier rappel : Veuillez confirmer votre statut dans les 24 heures',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .button { display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .urgent { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Digital Heirloom</h1>
    </div>
    <div class="content">
      <h2>Dernier rappel : 24 heures restantes</h2>
      <p>Cher ${data.userName},</p>
      <p>Ceci est votre <strong>dernier rappel</strong> de <strong>DigitalHeirloom.app</strong>.</p>
      <p>Il vous reste <strong>${data.hoursRemaining} heures</strong> pour confirmer votre statut actif avant que votre protocole d'héritage ne soit automatiquement déclenché.</p>
      
      <div class="urgent">
        <strong>🚨 URGENT :</strong> Veuillez cliquer sur le bouton ci-dessous immédiatement pour confirmer que vous êtes en sécurité et actif.
      </div>
      
      <div style="text-align: center;">
        <a href="${data.confirmLink}" class="button">CONFIRMER MAINTENANT - LE TEMPS PRESSE</a>
      </div>
      
      <p>Si vous ne confirmez pas dans les ${data.hoursRemaining} prochaines heures, vos bénéficiaires désignés seront notifiés et votre héritage numérique sera transféré conformément à vos paramètres.</p>
    </div>
    <div class="footer">
      <p>Ceci est un message automatisé. Veuillez ne pas répondre à cet e-mail.</p>
      <p>© 2025 Digital Heirloom. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
      `,
    },
  };

  return templates[language] || templates.en;
}

/**
 * 获取受益人继承通知邮件模板
 */
export function getInheritanceNoticeEmailTemplate(
  data: InheritanceNoticeEmailData,
  language: EmailLanguage = 'en'
): { subject: string; html: string } {
  const templates = {
    en: {
      subject: `Important Notice: Digital Legacy Transfer for ${data.userName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .info-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
    .token-box { background: #f3f4f6; padding: 15px; border-radius: 5px; font-family: monospace; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Digital Heirloom</h1>
    </div>
    <div class="content">
      <h2>Important Notice: Digital Legacy Transfer</h2>
      <p>Dear ${data.beneficiaryName},</p>
      <p>We are contacting you because <strong>${data.userName}</strong> has designated you as the beneficiary of their digital legacy at <strong>DigitalHeirloom.app</strong>.</p>
      
      <div class="info-box">
        <p><strong>Our security protocol has been triggered.</strong></p>
        <p>This means that ${data.userName} has not confirmed their active status within the specified grace period, and the inheritance protocol has been automatically activated.</p>
        <p><em>Based on our zero-knowledge encryption architecture, even when the system triggers, DigitalHeirloom employees cannot view your legacy content.</em></p>
      </div>
      
      <h3>What Happens Next:</h3>
      <ol>
        <li><strong>Physical Recovery Kit:</strong> A physical Recovery Kit containing decryption credentials is being dispatched to your address via ShipAny.</li>
        ${data.shippingTrackingNumber ? `<li><strong>Tracking Information:</strong> Your tracking number is <strong>${data.shippingTrackingNumber}</strong> (Carrier: ${data.shippingCarrier || 'TBD'}).</li>` : ''}
        <li><strong>Digital Access:</strong> Once the kit arrives, you can scan the QR code and use the provided Release Token to unlock the vault.</li>
        <li><strong>Vault Access Portal:</strong> Visit <a href="${data.unlockLink}">${data.unlockLink}</a></li>
      </ol>
      
      <div class="token-box">
        <p><strong>Release Token:</strong></p>
        <p style="font-size: 18px; font-weight: bold;">${data.releaseToken}</p>
      </div>
      
      <p><strong>Our thoughts are with you during this transition.</strong></p>
      
      <p>If you have any questions or concerns, please contact our support team at support@digitalheirloom.app</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>© 2025 Digital Heirloom. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
    },
    zh: {
      subject: `重要通知：关于 ${data.userName} 的数字遗产转交协议`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .info-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
    .token-box { background: #f3f4f6; padding: 15px; border-radius: 5px; font-family: monospace; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>数字遗产</h1>
    </div>
    <div class="content">
      <h2>重要通知：数字遗产转交</h2>
      <p>尊敬的 ${data.beneficiaryName}，</p>
      <p>我们联系您是因为 <strong>${data.userName}</strong> 在 <strong>DigitalHeirloom.app</strong> 将您指定为其数字遗产的受益人。</p>
      
      <div class="info-box">
        <p><strong>我们的安全协议已被触发。</strong></p>
        <p>这意味着 ${data.userName} 未在指定的宽限期内确认其活跃状态，遗产转交程序已自动激活。</p>
        <p><em>基于我们的零知识加密架构，即使系统触发，DigitalHeirloom 员工也无法查看您的遗产内容。</em></p>
      </div>
      
      <h3>接下来会发生什么：</h3>
      <ol>
        <li><strong>物理恢复包：</strong> 包含解密凭证的物理恢复包正在通过 ShipAny 寄送到您的地址。</li>
        ${data.shippingTrackingNumber ? `<li><strong>物流追踪信息：</strong> 您的追踪单号为 <strong>${data.shippingTrackingNumber}</strong>（承运商：${data.shippingCarrier || '待定'}）。</li>` : ''}
        <li><strong>数字访问：</strong> 恢复包到达后，您可以扫描二维码并使用提供的释放令牌解锁保险箱。</li>
        <li><strong>保险箱访问门户：</strong> 访问 <a href="${data.unlockLink}">${data.unlockLink}</a></li>
      </ol>
      
      <div class="token-box">
        <p><strong>释放令牌：</strong></p>
        <p style="font-size: 18px; font-weight: bold;">${data.releaseToken}</p>
      </div>
      
      <p><strong>我们在此过渡期间与您同在。</strong></p>
      
      <p>如果您有任何问题或疑虑，请联系我们的支持团队：support@digitalheirloom.app</p>
    </div>
    <div class="footer">
      <p>这是一封自动发送的邮件，请勿回复。</p>
      <p>© 2025 Digital Heirloom. 保留所有权利。</p>
    </div>
  </div>
</body>
</html>
      `,
    },
    fr: {
      subject: `Avis important : Transfert d'héritage numérique pour ${data.userName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .info-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
    .token-box { background: #f3f4f6; padding: 15px; border-radius: 5px; font-family: monospace; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Digital Heirloom</h1>
    </div>
    <div class="content">
      <h2>Avis important : Transfert d'héritage numérique</h2>
      <p>Cher ${data.beneficiaryName},</p>
      <p>Nous vous contactons car <strong>${data.userName}</strong> vous a désigné comme bénéficiaire de son héritage numérique sur <strong>DigitalHeirloom.app</strong>.</p>
      
      <div class="info-box">
        <p><strong>Notre protocole de sécurité a été déclenché.</strong></p>
        <p>Cela signifie que ${data.userName} n'a pas confirmé son statut actif dans la période de grâce spécifiée, et le protocole d'héritage a été automatiquement activé.</p>
        <p><em>Basé sur notre architecture de chiffrement à connaissance zéro, même lorsque le système se déclenche, les employés de DigitalHeirloom ne peuvent pas voir le contenu de votre héritage.</em></p>
      </div>
      
      <h3>Ce qui se passe ensuite :</h3>
      <ol>
        <li><strong>Kit de récupération physique :</strong> Un kit de récupération physique contenant les identifiants de déchiffrement est expédié à votre adresse via ShipAny.</li>
        ${data.shippingTrackingNumber ? `<li><strong>Informations de suivi :</strong> Votre numéro de suivi est <strong>${data.shippingTrackingNumber}</strong> (Transporteur : ${data.shippingCarrier || 'À déterminer'}).</li>` : ''}
        <li><strong>Accès numérique :</strong> Une fois le kit arrivé, vous pouvez scanner le code QR et utiliser le jeton de libération fourni pour déverrouiller le coffre-fort.</li>
        <li><strong>Portail d'accès au coffre-fort :</strong> Visitez <a href="${data.unlockLink}">${data.unlockLink}</a></li>
      </ol>
      
      <div class="token-box">
        <p><strong>Jeton de libération :</strong></p>
        <p style="font-size: 18px; font-weight: bold;">${data.releaseToken}</p>
      </div>
      
      <p><strong>Nos pensées sont avec vous pendant cette transition.</strong></p>
      
      <p>Si vous avez des questions ou des préoccupations, veuillez contacter notre équipe de support à support@digitalheirloom.app</p>
    </div>
    <div class="footer">
      <p>Ceci est un message automatisé. Veuillez ne pas répondre à cet e-mail.</p>
      <p>© 2025 Digital Heirloom. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
      `,
    },
  };

  return templates[language] || templates.en;
}
