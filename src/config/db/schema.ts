import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    // Plan management fields
    planType: text('plan_type').default('free'), // free, base, pro, on_demand
    freeTrialUsed: integer('free_trial_used').default(0), // Free trial count used
    lastCheckinDate: text('last_checkin_date'), // Last check-in date (YYYY-MM-DD)
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Search users by name in admin dashboard
    index('idx_user_name').on(table.name),
    // Order users by registration time for latest users list
    index('idx_user_created_at').on(table.createdAt),
  ]
);

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    // Composite: Query user sessions and filter by expiration
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_session_user_expires').on(table.userId, table.expiresAt),
  ]
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Query all linked accounts for a user
    index('idx_account_user_id').on(table.userId),
    // Composite: OAuth login (most critical)
    // Can also be used for: WHERE providerId = ? (left-prefix)
    index('idx_account_provider_account').on(table.providerId, table.accountId),
  ]
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Find verification code by identifier (e.g., find code by email)
    index('idx_verification_identifier').on(table.identifier),
  ]
);

export const config = pgTable('config', {
  name: text('name').unique().notNull(),
  value: text('value'),
});

export const taxonomy = pgTable(
  'taxonomy',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    slug: text('slug').unique().notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    image: text('image'),
    icon: text('icon'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Composite: Query taxonomies by type and status
    // Can also be used for: WHERE type = ? (left-prefix)
    index('idx_taxonomy_type_status').on(table.type, table.status),
  ]
);

export const post = pgTable(
  'post',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    slug: text('slug').unique().notNull(),
    type: text('type').notNull(),
    title: text('title'),
    description: text('description'),
    image: text('image'),
    content: text('content'),
    categories: text('categories'),
    tags: text('tags'),
    authorName: text('author_name'),
    authorImage: text('author_image'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Composite: Query posts by type and status
    // Can also be used for: WHERE type = ? (left-prefix)
    index('idx_post_type_status').on(table.type, table.status),
  ]
);

export const order = pgTable(
  'order',
  {
    id: text('id').primaryKey(),
    orderNo: text('order_no').unique().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // checkout user email
    status: text('status').notNull(), // created, paid, failed
    amount: integer('amount').notNull(), // checkout amount in cents
    currency: text('currency').notNull(), // checkout currency
    productId: text('product_id'),
    paymentType: text('payment_type'), // one_time, subscription
    paymentInterval: text('payment_interval'), // day, week, month, year
    paymentProvider: text('payment_provider').notNull(),
    paymentSessionId: text('payment_session_id'),
    checkoutInfo: text('checkout_info').notNull(), // checkout request info
    checkoutResult: text('checkout_result'), // checkout result
    paymentResult: text('payment_result'), // payment result
    discountCode: text('discount_code'), // discount code
    discountAmount: integer('discount_amount'), // discount amount in cents
    discountCurrency: text('discount_currency'), // discount currency
    paymentEmail: text('payment_email'), // actual payment email
    paymentAmount: integer('payment_amount'), // actual payment amount
    paymentCurrency: text('payment_currency'), // actual payment currency
    paidAt: timestamp('paid_at'), // paid at
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    description: text('description'), // order description
    productName: text('product_name'), // product name
    subscriptionId: text('subscription_id'), // provider subscription id
    subscriptionResult: text('subscription_result'), // provider subscription result
    checkoutUrl: text('checkout_url'), // checkout url
    callbackUrl: text('callback_url'), // callback url, after handle callback
    creditsAmount: integer('credits_amount'), // credits amount
    creditsValidDays: integer('credits_valid_days'), // credits validity days
    planName: text('plan_name'), // subscription plan name
    paymentProductId: text('payment_product_id'), // payment product id
    invoiceId: text('invoice_id'),
    invoiceUrl: text('invoice_url'),
    subscriptionNo: text('subscription_no'), // order subscription no
    transactionId: text('transaction_id'), // payment transaction id
    paymentUserName: text('payment_user_name'), // payment user name
    paymentUserId: text('payment_user_id'), // payment user id
  },
  (table) => [
    // Composite: Query user orders by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_order_user_status_payment_type').on(
      table.userId,
      table.status,
      table.paymentType
    ),
    // Composite: Prevent duplicate payments
    // Can also be used for: WHERE transactionId = ? (left-prefix)
    index('idx_order_transaction_provider').on(
      table.transactionId,
      table.paymentProvider
    ),
    // Order orders by creation time for listing
    index('idx_order_created_at').on(table.createdAt),
  ]
);

export const subscription = pgTable(
  'subscription',
  {
    id: text('id').primaryKey(),
    subscriptionNo: text('subscription_no').unique().notNull(), // subscription no
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // subscription user email
    status: text('status').notNull(), // subscription status
    paymentProvider: text('payment_provider').notNull(),
    subscriptionId: text('subscription_id').notNull(), // provider subscription id
    subscriptionResult: text('subscription_result'), // provider subscription result
    productId: text('product_id'), // product id
    description: text('description'), // subscription description
    amount: integer('amount'), // subscription amount
    currency: text('currency'), // subscription currency
    interval: text('interval'), // subscription interval, day, week, month, year
    intervalCount: integer('interval_count'), // subscription interval count
    trialPeriodDays: integer('trial_period_days'), // subscription trial period days
    currentPeriodStart: timestamp('current_period_start'), // subscription current period start
    currentPeriodEnd: timestamp('current_period_end'), // subscription current period end
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    planName: text('plan_name'),
    planType: text('plan_type'), // free, base, pro, on_demand
    billingUrl: text('billing_url'),
    productName: text('product_name'), // subscription product name
    creditsAmount: integer('credits_amount'), // subscription credits amount
    creditsValidDays: integer('credits_valid_days'), // subscription credits valid days
    // Plan limits
    maxVideoDuration: integer('max_video_duration'), // Video duration limit in seconds (null = unlimited)
    concurrentLimit: integer('concurrent_limit').default(1), // Concurrent task limit (null = unlimited)
    exportFormats: text('export_formats'), // JSON array: ["SRT","CSV","VTT","TXT"]
    storageHours: integer('storage_hours').default(24), // Storage duration in hours
    translationCharLimit: integer('translation_char_limit'), // Translation character limit (null = unlimited)
    paymentProductId: text('payment_product_id'), // subscription payment product id
    paymentUserId: text('payment_user_id'), // subscription payment user id
    canceledAt: timestamp('canceled_at'), // subscription canceled apply at
    canceledEndAt: timestamp('canceled_end_at'), // subscription canceled end at
    canceledReason: text('canceled_reason'), // subscription canceled reason
    canceledReasonType: text('canceled_reason_type'), // subscription canceled reason type
  },
  (table) => [
    // Composite: Query user's subscriptions by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_subscription_user_status_interval').on(
      table.userId,
      table.status,
      table.interval
    ),
    // Composite: Prevent duplicate subscriptions
    // Can also be used for: WHERE paymentProvider = ? (left-prefix)
    index('idx_subscription_provider_id').on(
      table.subscriptionId,
      table.paymentProvider
    ),
    // Order subscriptions by creation time for listing
    index('idx_subscription_created_at').on(table.createdAt),
  ]
);

export const credit = pgTable(
  'credit',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }), // user id
    userEmail: text('user_email'), // user email
    orderNo: text('order_no'), // payment order no
    subscriptionNo: text('subscription_no'), // subscription no
    transactionNo: text('transaction_no').unique().notNull(), // transaction no
    transactionType: text('transaction_type').notNull(), // transaction type, grant / consume
    transactionScene: text('transaction_scene'), // transaction scene, payment / subscription / gift / award
    credits: integer('credits').notNull(), // credits amount, n or -n
    remainingCredits: integer('remaining_credits').notNull().default(0), // remaining credits amount
    description: text('description'), // transaction description
    expiresAt: timestamp('expires_at'), // transaction expires at
    status: text('status').notNull(), // transaction status
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    consumedDetail: text('consumed_detail'), // consumed detail
    metadata: text('metadata'), // transaction metadata
  },
  (table) => [
    // Critical composite index for credit consumption (FIFO queue)
    // Query: WHERE userId = ? AND transactionType = 'grant' AND status = 'active'
    //        AND remainingCredits > 0 ORDER BY expiresAt
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_credit_consume_fifo').on(
      table.userId,
      table.status,
      table.transactionType,
      table.remainingCredits,
      table.expiresAt
    ),
    // Query credits by order number
    index('idx_credit_order_no').on(table.orderNo),
    // Query credits by subscription number
    index('idx_credit_subscription_no').on(table.subscriptionNo),
  ]
);

export const apikey = pgTable(
  'apikey',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    // Composite: Query user's API keys by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_apikey_user_status').on(table.userId, table.status),
    // Composite: Validate active API key (most common for auth)
    // Can also be used for: WHERE key = ? (left-prefix)
    index('idx_apikey_key_status').on(table.key, table.status),
  ]
);

// RBAC Tables
export const role = pgTable(
  'role',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(), // admin, editor, viewer
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Query active roles
    index('idx_role_status').on(table.status),
  ]
);

export const permission = pgTable(
  'permission',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(), // admin.users.read, admin.posts.write
    resource: text('resource').notNull(), // users, posts, categories
    action: text('action').notNull(), // read, write, delete
    title: text('title').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Composite: Query permissions by resource and action
    // Can also be used for: WHERE resource = ? (left-prefix)
    index('idx_permission_resource_action').on(table.resource, table.action),
  ]
);

export const rolePermission = pgTable(
  'role_permission',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permission.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    // Composite: Query permissions for a role
    // Can also be used for: WHERE roleId = ? (left-prefix)
    index('idx_role_permission_role_permission').on(
      table.roleId,
      table.permissionId
    ),
  ]
);

export const userRole = pgTable(
  'user_role',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => [
    // Composite: Query user's active roles (most critical for auth)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_user_role_user_expires').on(table.userId, table.expiresAt),
  ]
);

// ============================================
// ⚠️ 已删除 - Digital Heirloom 项目不需要
// 以下表定义已删除：
// - aiTask (AI 任务表)
// - chat (AI 聊天表)
// - chatMessage (AI 聊天消息表)
// - mediaTasks (媒体任务表)
// 删除日期: 2025-01-15
// 原因: 项目转向 Digital Heirloom，不再需要这些功能
// ============================================

export const dailyCheckins = pgTable(
  'daily_checkins',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    checkinDate: text('checkin_date').notNull(), // Format: YYYY-MM-DD (UTC)
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // Unique index: Prevent duplicate check-ins for same user on same date
    // This provides physical isolation at database level
    index('idx_daily_checkin_user_date').on(table.userId, table.checkinDate),
  ]
);

// ============================================
// ⚠️ 已删除 - Digital Heirloom 项目不需要
// 以下表定义已删除：
// - testimonial (用户评价表)
// - videoCache (视频缓存表)
// 删除日期: 2025-01-15
// 原因: 项目转向 Digital Heirloom，不再需要这些功能
// ============================================

// ============================================
// Digital Heirloom - 数字遗产管理表
// ============================================

/**
 * 数字保险箱主表
 * 存储用户的加密数字资产
 */
export const digitalVaults = pgTable(
  'digital_vaults',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // 加密数据（AES-256-GCM 加密后的 JSON 字符串）
    encryptedData: text('encrypted_data'),
    // 加密盐值（Base64）
    encryptionSalt: text('encryption_salt'),
    // 加密初始向量（Base64）
    encryptionIv: text('encryption_iv'),
    // 密码提示（可选，不包含密码本身）
    encryptionHint: text('encryption_hint'),
    // 恢复包：加密的主密码备份（使用助记词加密）
    recoveryBackupToken: text('recovery_backup_token'),
    recoveryBackupSalt: text('recovery_backup_salt'),
    recoveryBackupIv: text('recovery_backup_iv'),
    // 心跳频率（天数，默认90天）
    heartbeatFrequency: integer('heartbeat_frequency').default(90).notNull(),
    // 宽限期（天数，默认7天）
    gracePeriod: integer('grace_period').default(7).notNull(),
    // 最后活跃时间
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    // 死信开关是否启用
    deadManSwitchEnabled: boolean('dead_man_switch_enabled').default(false).notNull(),
    // 死信开关激活时间
    deadManSwitchActivatedAt: timestamp('dead_man_switch_activated_at'),
    // 状态：active, warning, activated, released, pending, triggered, completed
    status: text('status').default('active').notNull(),
    // 验证令牌（用于邮件确认链接）
    verificationToken: text('verification_token').unique(),
    // 验证令牌过期时间
    verificationTokenExpiresAt: timestamp('verification_token_expires_at'),
    // 预警邮件发送时间（防止重复发送）
    warningEmailSentAt: timestamp('warning_email_sent_at'),
    // 预警邮件发送次数
    warningEmailCount: integer('warning_email_count').default(0),
    // 二次提醒邮件发送时间
    reminderEmailSentAt: timestamp('reminder_email_sent_at'),
    // 订阅管理字段（Digital Heirloom 专用）
    currentPeriodEnd: timestamp('current_period_end'), // 订阅结束日期
    bonusDays: integer('bonus_days').default(0), // 赠送的天数（累计）
    planLevel: text('plan_level').default('free'), // 'free' | 'base' | 'pro'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // 查询用户的保险箱
    index('idx_vault_user_status').on(table.userId, table.status),
    // 失联检测查询（按最后活跃时间）
    index('idx_vault_last_seen_status').on(table.lastSeenAt, table.status),
  ]
);

/**
 * 受益人表
 * 存储受益人信息和物流地址（预留 ShipAny 接口）
 */
export const beneficiaries = pgTable(
  'beneficiaries',
  {
    id: text('id').primaryKey(),
    vaultId: text('vault_id')
      .notNull()
      .references(() => digitalVaults.id, { onDelete: 'cascade' }),
    // 受益人信息
    name: text('name').notNull(),
    email: text('email').notNull(),
    relationship: text('relationship'), // spouse, child, parent, friend等
    language: text('language').default('en'), // 偏好语言（en, zh, fr）
    phone: text('phone'),
    // ShipAny 物流预留字段（暂时不使用，但保留）
    receiverName: text('receiver_name'),
    addressLine1: text('address_line1'),
    city: text('city'),
    zipCode: text('zip_code'),
    countryCode: text('country_code').default('HKG'),
    // 物理资产相关（Pro 版）
    physicalAssetDescription: text('physical_asset_description'), // 物理资产描述（U盘、信件等）
    physicalAssetPhotoUrl: text('physical_asset_photo_url'), // 物理资产照片URL
    // 资产释放相关
    releaseToken: text('release_token'), // 临时访问令牌
    releaseTokenExpiresAt: timestamp('release_token_expires_at'), // 令牌过期时间
    releasedAt: timestamp('released_at'), // 资产释放时间
    // 受益人延迟解锁机制（二次保险）
    unlockRequestedAt: timestamp('unlock_requested_at'), // 受益人请求解锁的时间
    unlockDelayUntil: timestamp('unlock_delay_until'), // 延迟解锁截止时间（unlock_requested_at + 24小时）
    unlockNotificationSent: boolean('unlock_notification_sent').default(false), // 是否已向原用户发送通知
    // 解密次数管理（Digital Heirloom 专用）
    decryptionCount: integer('decryption_count').default(0), // 当前解密次数
    decryptionLimit: integer('decryption_limit').default(1), // 默认解密限制
    bonusDecryptionCount: integer('bonus_decryption_count').default(0), // 管理员赠送次数
    lastDecryptionAt: timestamp('last_decryption_at'), // 最后解密时间
    // 解密审计日志
    decryptionHistory: jsonb('decryption_history').default([]), // 解密尝试记录
    // 物理恢复包管理
    isPhysicalVerificationEnabled: boolean('is_physical_verification_enabled').default(false), // 是否启用物理验证
    physicalKitMailed: boolean('physical_kit_mailed').default(false), // 物理恢复包是否已寄送
    trackingNumber: text('tracking_number'), // 物流单号
    // 状态：pending, notified, unlock_requested, released
    status: text('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // 查询保险箱的受益人
    index('idx_beneficiary_vault').on(table.vaultId),
    // 查询待释放的受益人
    index('idx_beneficiary_status').on(table.status),
    // Token 查询（用于资产提取）
    index('idx_beneficiary_token').on(table.releaseToken),
  ]
);

/**
 * 心跳日志表
 * 记录用户的心跳确认记录
 */
export const heartbeatLogs = pgTable(
  'heartbeat_logs',
  {
    id: text('id').primaryKey(),
    vaultId: text('vault_id')
      .notNull()
      .references(() => digitalVaults.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    checkinDate: text('checkin_date').notNull(), // YYYY-MM-DD格式
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // 查询保险箱的心跳记录
    index('idx_heartbeat_vault_date').on(table.vaultId, table.checkinDate),
    // 查询用户的心跳记录
    index('idx_heartbeat_user_date').on(table.userId, table.checkinDate),
  ]
);

/**
 * 死信开关事件日志表
 * 记录死信开关的所有事件
 */
export const deadManSwitchEvents = pgTable(
  'dead_man_switch_events',
  {
    id: text('id').primaryKey(),
    vaultId: text('vault_id')
      .notNull()
      .references(() => digitalVaults.id, { onDelete: 'cascade' }),
    // 事件类型：warning_sent, grace_period_started, assets_released
    eventType: text('event_type').notNull(),
    // 事件详情（JSON格式）
    eventData: text('event_data'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // 查询保险箱的事件日志
    index('idx_dms_event_vault').on(table.vaultId),
    // 按事件类型查询
    index('idx_dms_event_type').on(table.eventType),
  ]
);

/**
 * 物理资产物流表
 * 记录 Pro 版用户的物理资产交付流程
 */
export const shippingLogs = pgTable(
  'shipping_logs',
  {
    id: text('id').primaryKey(),
    vaultId: text('vault_id')
      .notNull()
      .references(() => digitalVaults.id, { onDelete: 'cascade' }),
    beneficiaryId: text('beneficiary_id')
      .notNull()
      .references(() => beneficiaries.id, { onDelete: 'cascade' }),
    // 物流信息
    receiverName: text('receiver_name').notNull(),
    receiverPhone: text('receiver_phone'),
    addressLine1: text('address_line1').notNull(),
    city: text('city').notNull(),
    zipCode: text('zip_code'),
    countryCode: text('country_code').default('HKG'),
    // 运费相关
    shippingFeeStatus: text('shipping_fee_status').default('not_required'), // not_required, pending_payment, paid, waived
    estimatedAmount: integer('estimated_amount'), // 预估运费（单位：分）
    finalAmount: integer('final_amount'), // 最终运费（单位：分）
    creemPaymentLink: text('creem_payment_link'), // Creem 支付链接
    creemCheckoutId: text('creem_checkout_id'), // Creem Checkout Session ID
    // 物流状态
    status: text('status').default('pending_review'), // pending_review, waiting_payment, ready_to_ship, shipped, delivered, cancelled
    trackingNumber: text('tracking_number'), // 物流单号
    carrier: text('carrier'), // 承运商 (SF, FedEx, DHL等)
    // 时间戳
    requestedAt: timestamp('requested_at').defaultNow(), // 请求时间（死信开关触发时）
    reviewedAt: timestamp('reviewed_at'), // 管理员审核时间
    paymentRequestedAt: timestamp('payment_requested_at'), // 发送支付链接时间
    paidAt: timestamp('paid_at'), // 支付完成时间
    shippedAt: timestamp('shipped_at'), // 发货时间
    deliveredAt: timestamp('delivered_at'), // 送达时间
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // 查询保险箱的物流记录
    index('idx_shipping_vault').on(table.vaultId),
    // 查询受益人的物流记录
    index('idx_shipping_beneficiary').on(table.beneficiaryId),
    // 按状态查询
    index('idx_shipping_status').on(table.status),
    // 按运费状态查询
    index('idx_shipping_fee_status').on(table.shippingFeeStatus),
    // 按 Creem Checkout ID 查询
    index('idx_shipping_creem_checkout').on(table.creemCheckoutId),
  ]
);

/**
 * 邮件通知日志表
 * 记录所有发送给用户和受益人的邮件
 */
export const emailNotifications = pgTable(
  'email_notifications',
  {
    id: text('id').primaryKey(),
    vaultId: text('vault_id')
      .notNull()
      .references(() => digitalVaults.id, { onDelete: 'cascade' }),
    recipientEmail: text('recipient_email').notNull(),
    recipientType: text('recipient_type').notNull(), // 'user' | 'beneficiary'
    emailType: text('email_type').notNull(), // 'heartbeat_warning' | 'heartbeat_reminder' | 'inheritance_notice'
    subject: text('subject').notNull(),
    sentAt: timestamp('sent_at').defaultNow().notNull(),
    openedAt: timestamp('opened_at'), // 邮件打开时间（通过 Resend 追踪）
    clickedAt: timestamp('clicked_at'), // 链接点击时间
    status: text('status').default('pending').notNull(), // 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed'
    errorMessage: text('error_message'),
    resendMessageId: text('resend_message_id'), // Resend API 返回的 message_id
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // 查询保险箱的邮件记录
    index('idx_email_vault').on(table.vaultId),
    // 按邮件类型查询
    index('idx_email_type').on(table.emailType),
    // 按状态查询
    index('idx_email_status').on(table.status),
    // 按收件人查询
    index('idx_email_recipient').on(table.recipientEmail),
  ]
);

/**
 * 管理员审计日志表
 * 记录所有管理员操作，确保可追溯性和安全性
 */
export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    id: text('id').primaryKey().default('gen_random_uuid()'),
    adminId: text('admin_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    actionType: text('action_type').notNull(), // 'EXTEND_SUBSCRIPTION', 'RESET_DECRYPTION_COUNT', 'ADD_DECRYPTION_COUNT', 'ADD_BONUS_DECRYPTION_COUNT', 'PAUSE', 'RESET_HEARTBEAT', 'TRIGGER_NOW'
    vaultId: text('vault_id').references(() => digitalVaults.id, { onDelete: 'set null' }),
    beneficiaryId: text('beneficiary_id').references(() => beneficiaries.id, { onDelete: 'set null' }),
    actionData: jsonb('action_data').default({}), // 操作详情（补偿天数、次数等）
    reason: text('reason'), // 操作原因（必填）
    beforeState: jsonb('before_state').default({}), // 操作前状态快照
    afterState: jsonb('after_state').default({}), // 操作后状态快照
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // 查询管理员的操作记录
    index('idx_admin_audit_admin').on(table.adminId),
    // 查询保险箱的操作记录
    index('idx_admin_audit_vault').on(table.vaultId),
    // 按时间排序
    index('idx_admin_audit_created').on(table.createdAt),
    // 按操作类型查询
    index('idx_admin_audit_action').on(table.actionType),
    // 查询受益人的操作记录
    index('idx_admin_audit_beneficiary').on(table.beneficiaryId),
  ]
);

/**
 * 系统报警历史记录表
 * 记录所有系统报警事件
 */
export const systemAlerts = pgTable(
  'system_alerts',
  {
    id: text('id').primaryKey().default('gen_random_uuid()'),
    level: text('level').notNull(), // 'info' | 'warning' | 'critical'
    type: text('type').notNull(), // 'business' | 'resource' | 'cost'
    category: text('category').notNull(), // 'triggered_spike', 'email_limit', 'email_failure_rate', 'storage_limit', 'shipping_limit'
    message: text('message').notNull(),
    alertData: jsonb('alert_data').default({}), // 报警数据详情
    resolved: boolean('resolved').default(false), // 是否已解决
    resolvedAt: timestamp('resolved_at'), // 解决时间
    resolvedBy: text('resolved_by').references(() => user.id, { onDelete: 'set null' }), // 解决人
    resolvedNote: text('resolved_note'), // 解决备注
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // 查询未解决的报警
    index('idx_alert_resolved').on(table.resolved),
    // 按时间排序
    index('idx_alert_created').on(table.createdAt),
    // 按级别查询
    index('idx_alert_level').on(table.level),
    // 按类型查询
    index('idx_alert_type').on(table.type),
    // 按类别查询
    index('idx_alert_category').on(table.category),
  ]
);
