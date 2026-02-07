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
// SoloBoard - 多站点监控系统表
// ============================================

/**
 * 报警规则表
 * 存储用户配置的报警规则
 */
export const alertRules = pgTable(
  'alert_rules',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    siteId: text('site_id')
      .notNull()
      .references(() => monitoredSites.id, { onDelete: 'cascade' }),
    // 报警类型
    alertType: text('alert_type').notNull(), // 'downtime', 'slow_response', 'revenue_drop', 'traffic_spike'
    // 阈值配置
    threshold: jsonb('threshold').notNull().$type<{
      responseTime?: number; // 响应时间（毫秒）
      downtime?: number; // 宕机时长（秒）
      revenueDropPercent?: number; // 收入下降百分比
      trafficSpikePercent?: number; // 流量激增百分比
    }>(),
    // 通知渠道
    channels: jsonb('channels').notNull().$type<string[]>(), // ['email', 'telegram', 'webhook']
    // 冷却期（秒）
    cooldown: integer('cooldown').default(300), // 5分钟
    // 最后触发时间
    lastTriggeredAt: timestamp('last_triggered_at'),
    // 状态
    enabled: boolean('enabled').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('idx_alert_rule_site').on(table.siteId),
    index('idx_alert_rule_user').on(table.userId),
  ]
);

/**
 * 报警历史表
 * 记录所有触发的报警
 */
export const alertHistory = pgTable(
  'alert_history',
  {
    id: text('id').primaryKey(),
    ruleId: text('rule_id')
      .notNull()
      .references(() => alertRules.id, { onDelete: 'cascade' }),
    siteId: text('site_id')
      .notNull()
      .references(() => monitoredSites.id, { onDelete: 'cascade' }),
    // 报警详情
    alertType: text('alert_type').notNull(),
    message: text('message').notNull(),
    severity: text('severity').notNull(), // 'info', 'warning', 'critical'
    // 触发数据
    triggerData: jsonb('trigger_data').$type<Record<string, any>>(),
    // 通知状态
    notificationStatus: jsonb('notification_status').$type<{
      email?: 'sent' | 'failed';
      telegram?: 'sent' | 'failed';
      webhook?: 'sent' | 'failed';
    }>(),
    // 是否已解决
    resolved: boolean('resolved').default(false),
    resolvedAt: timestamp('resolved_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_alert_history_site').on(table.siteId),
    index('idx_alert_history_rule').on(table.ruleId),
    index('idx_alert_history_created').on(table.createdAt),
  ]
);

/**
 * 团队表
 * 支持团队协作功能
 */
export const teams = pgTable(
  'teams',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    description: text('description'),
    // 团队设置
    settings: jsonb('settings').$type<{
      maxMembers?: number;
      allowGuestAccess?: boolean;
    }>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('idx_team_owner').on(table.ownerId),
  ]
);

/**
 * 团队成员表
 * 管理团队成员和权限
 */
export const teamMembers = pgTable(
  'team_members',
  {
    id: text('id').primaryKey(),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // 角色
    role: text('role').notNull(), // 'owner', 'admin', 'editor', 'viewer'
    // 权限
    permissions: jsonb('permissions').$type<{
      canAddSites?: boolean;
      canEditSites?: boolean;
      canDeleteSites?: boolean;
      canManageMembers?: boolean;
      canViewReports?: boolean;
    }>(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    invitedBy: text('invited_by').references(() => user.id),
  },
  (table) => [
    index('idx_team_member_team').on(table.teamId),
    index('idx_team_member_user').on(table.userId),
  ]
);

/**
 * 团队站点表
 * 管理团队共享的站点
 */
export const teamSites = pgTable(
  'team_sites',
  {
    id: text('id').primaryKey(),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    siteId: text('site_id')
      .notNull()
      .references(() => monitoredSites.id, { onDelete: 'cascade' }),
    sharedBy: text('shared_by')
      .notNull()
      .references(() => user.id),
    sharedAt: timestamp('shared_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_team_site_team').on(table.teamId),
    index('idx_team_site_site').on(table.siteId),
  ]
);

/**
 * AI 报告表
 * 存储 AI 生成的智能周报
 */
export const aiReports = pgTable(
  'ai_reports',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // 报告类型
    reportType: text('report_type').notNull(), // 'daily', 'weekly', 'monthly'
    // 时间范围
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    // 报告内容
    summary: text('summary').notNull(), // AI 生成的摘要
    insights: jsonb('insights').notNull().$type<string[]>(), // 洞察列表
    recommendations: jsonb('recommendations').notNull().$type<string[]>(), // 建议列表
    // 数据快照
    metricsSnapshot: jsonb('metrics_snapshot').$type<Record<string, any>>(),
    // 生成状态
    status: text('status').default('generated'), // 'generating', 'generated', 'failed'
    // 是否已发送
    sent: boolean('sent').default(false),
    sentAt: timestamp('sent_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_ai_report_user').on(table.userId),
    index('idx_ai_report_created').on(table.createdAt),
  ]
);

// ============================================
// SoloBoard - 多站点监控系统表
// ============================================

/**
 * 监控站点表
 * 存储用户添加的网站及其 API 配置（加密存储）
 */
export const monitoredSites = pgTable(
  'monitored_sites',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // 站点基本信息
    name: text('name').notNull(), // 网站名称（如 "我的 AI 工具"）
    url: text('url').notNull(), // 网站地址
    platform: text('platform').notNull(), // 'GA4', 'STRIPE', 'LEMON_SQUEEZY', 'SHOPIFY', 'UPTIME'
    // 加密的 API 配置（使用 AES-256-CBC 加密）
    encryptedConfig: text('encrypted_config').notNull(), // 加密后的 JSON 字符串
    // 缓存最后一次抓取的数据快照（实现秒开）
    lastSnapshot: jsonb('last_snapshot').$type<{
      metrics: Record<string, any>; // 指标数据
      updatedAt: string; // 更新时间
    }>(),
    // 站点状态
    status: text('status').default('active').notNull(), // 'active', 'error', 'paused'
    healthStatus: text('health_status').default('unknown'), // 'online', 'offline', 'unknown'
    lastSyncAt: timestamp('last_sync_at'), // 最后同步时间
    lastErrorAt: timestamp('last_error_at'), // 最后错误时间
    lastErrorMessage: text('last_error_message'), // 最后错误信息
    // 显示顺序
    displayOrder: integer('display_order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // 查询用户的站点
    index('idx_monitored_site_user').on(table.userId),
    // 按状态查询
    index('idx_monitored_site_status').on(table.status),
    // 按平台类型查询
    index('idx_monitored_site_platform').on(table.platform),
    // 按显示顺序排序
    index('idx_monitored_site_order').on(table.userId, table.displayOrder),
  ]
);

/**
 * 站点指标历史表
 * 存储站点的历史指标数据，用于趋势图表
 */
export const siteMetricsHistory = pgTable(
  'site_metrics_history',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => monitoredSites.id, { onDelete: 'cascade' }),
    // 指标数据（JSON 格式）
    metrics: jsonb('metrics').notNull().$type<{
      // GA4 指标
      activeUsers?: number;
      pageViews?: number;
      sessions?: number;
      // Stripe 指标
      revenue?: number;
      transactions?: number;
      // Uptime 指标
      responseTime?: number;
      isOnline?: boolean;
    }>(),
    // 时间戳（按小时聚合）
    recordedAt: timestamp('recorded_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // 查询站点的历史数据
    index('idx_metrics_site_time').on(table.siteId, table.recordedAt),
  ]
);

/**
 * 同步任务日志表
 * 记录每次数据同步的执行情况
 */
export const syncLogs = pgTable(
  'sync_logs',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => monitoredSites.id, { onDelete: 'cascade' }),
    status: text('status').notNull(), // 'success', 'failed', 'partial'
    duration: integer('duration'), // 执行时长（毫秒）
    errorMessage: text('error_message'),
    syncedMetrics: jsonb('synced_metrics'), // 同步的指标数据
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // 查询站点的同步日志
    index('idx_sync_log_site').on(table.siteId),
    // 按时间排序
    index('idx_sync_log_created').on(table.createdAt),
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
// ⚠️ 已删除 - 不需要的功能表
// 以下表定义已删除：
// - aiTask (AI 任务表) - 删除日期: 2025-01-15
// - chat (AI 聊天表) - 删除日期: 2025-01-15
// - chatMessage (AI 聊天消息表) - 删除日期: 2025-01-15
// - mediaTasks (媒体任务表) - 删除日期: 2025-01-15
// - testimonial (用户评价表) - 删除日期: 2025-01-15
// - videoCache (视频缓存表) - 删除日期: 2025-01-15
// - digitalVaults (数字保险箱) - 删除日期: 2026-02-07
// - beneficiaries (受益人) - 删除日期: 2026-02-07
// - heartbeatLogs (心跳日志) - 删除日期: 2026-02-07
// - deadManSwitchEvents (死信开关事件) - 删除日期: 2026-02-07
// - shippingLogs (物流记录) - 删除日期: 2026-02-07
// - emailNotifications (邮件通知) - 删除日期: 2026-02-07
// - adminAuditLogs (管理员审计) - 删除日期: 2026-02-07
// - systemAlerts (系统报警) - 删除日期: 2026-02-07
// 原因: SoloBoard 项目专注于多站点监控，不需要这些功能
// ============================================
