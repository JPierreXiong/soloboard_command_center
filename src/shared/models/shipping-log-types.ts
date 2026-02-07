/**
 * Shipping Log Types and Enums
 * This file can be imported by both client and server components
 */

/**
 * 物流状态枚举
 */
export enum ShippingStatus {
  PENDING_REVIEW = 'pending_review',
  WAITING_PAYMENT = 'waiting_payment',
  READY_TO_SHIP = 'ready_to_ship',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

/**
 * 运费状态枚举
 */
export enum ShippingFeeStatus {
  NOT_REQUIRED = 'not_required',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  WAIVED = 'waived',
}
