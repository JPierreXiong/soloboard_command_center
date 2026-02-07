'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Package, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { TableCard } from '@/shared/blocks/table';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { toast } from 'sonner';
import { type Table } from '@/shared/types/blocks/table';
// 从共享类型文件导入枚举（避免导入 server-only 模块）
import { ShippingStatus, ShippingFeeStatus } from '@/shared/models/shipping-log-types';

// 使用枚举值（字符串常量，避免导入整个模块）
const ShippingStatusValues = {
  PENDING_REVIEW: 'pending_review',
  WAITING_PAYMENT: 'waiting_payment',
  READY_TO_SHIP: 'ready_to_ship',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

const ShippingFeeStatusValues = {
  NOT_REQUIRED: 'not_required',
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  WAIVED: 'waived',
} as const;

interface ShippingRequestListProps {
  page?: number;
  limit?: number;
  status?: string | null;
  feeStatus?: string | null;
}

interface ShippingLogWithDetails {
  id: string;
  vaultId: string;
  beneficiaryId: string;
  receiverName: string;
  receiverPhone?: string;
  addressLine1: string;
  city: string;
  zipCode?: string;
  countryCode: string;
  shippingFeeStatus: string;
  estimatedAmount?: number;
  finalAmount?: number;
  creemPaymentLink?: string;
  status: string;
  trackingNumber?: string;
  carrier?: string;
  requestedAt: string;
  reviewedAt?: string;
  paymentRequestedAt?: string;
  paidAt?: string;
  shippedAt?: string;
  beneficiary?: {
    name: string;
    email: string;
    phone?: string;
  };
  vault?: {
    userId: string;
  };
  owner?: {
    name: string;
    email: string;
  };
}

export function ShippingRequestList({
  page = 1,
  limit = 20,
  status,
  feeStatus,
}: ShippingRequestListProps) {
  const router = useRouter();
  const [data, setData] = useState<ShippingLogWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedReq, setSelectedReq] = useState<ShippingLogWithDetails | null>(null);
  const [modalType, setModalType] = useState<'payment' | 'ship' | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取数据
  useEffect(() => {
    fetchData();
  }, [page, limit, status, feeStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: limit.toString(),
      });
      if (status) params.append('status', status);
      if (feeStatus) params.append('feeStatus', feeStatus);

      const res = await fetch(`/api/admin/shipping/list?${params.toString()}`);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
        setTotal(result.pagination.total);
      } else {
        toast.error('获取数据失败');
      }
    } catch (error) {
      console.error('Fetch shipping requests error:', error);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理发送支付链接
  const handleRequestPayment = async () => {
    if (!selectedReq || !inputValue) {
      toast.error('请输入运费金额');
      return;
    }

    const amount = parseFloat(inputValue);
    if (isNaN(amount) || amount <= 0) {
      toast.error('请输入有效的金额');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/shipping/request-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logId: selectedReq.id,
          amount: amount,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        toast.success('支付链接已发送至受益人邮箱');
        setModalType(null);
        setInputValue('');
        setSelectedReq(null);
        // 刷新数据
        fetchData();
      } else {
        toast.error(result.error || '发送失败');
      }
    } catch (error) {
      console.error('Request payment error:', error);
      toast.error('发送失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理确认发货
  const handleConfirmShip = async () => {
    if (!selectedReq || !inputValue.trim()) {
      toast.error('请输入物流单号');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/shipping/confirm-ship', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logId: selectedReq.id,
          trackingNumber: inputValue.trim(),
          carrier: 'SF', // 默认顺丰，可以后续扩展为选择
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        toast.success('发货状态已更新，通知已发送');
        setModalType(null);
        setInputValue('');
        setSelectedReq(null);
        // 刷新数据
        fetchData();
      } else {
        toast.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('Confirm ship error:', error);
      toast.error('操作失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取状态 Badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending_review: 'outline',
      waiting_payment: 'secondary',
      ready_to_ship: 'default',
      shipped: 'default',
      delivered: 'default',
      cancelled: 'destructive',
    };

    const labels: Record<string, string> = {
      pending_review: '待审核',
      waiting_payment: '待支付',
      ready_to_ship: '待发货',
      shipped: '已发货',
      delivered: '已送达',
      cancelled: '已取消',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  // 获取运费状态 Badge
  const getFeeStatusBadge = (feeStatus: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      not_required: 'outline',
      pending_payment: 'secondary',
      paid: 'default',
      waived: 'default',
    };

    const labels: Record<string, string> = {
      not_required: '无需支付',
      pending_payment: '待支付',
      paid: '已支付',
      waived: '已豁免',
    };

    return (
      <Badge variant={variants[feeStatus] || 'outline'}>
        {labels[feeStatus] || feeStatus}
      </Badge>
    );
  };

  const table: Table = {
    columns: [
      {
        name: 'beneficiary',
        title: '受益人',
        callback: (item: ShippingLogWithDetails) => (
          <div className="flex flex-col">
            <span className="font-medium">{item.beneficiary?.name || item.receiverName}</span>
            <span className="text-sm text-muted-foreground">{item.beneficiary?.email}</span>
          </div>
        ),
      },
      {
        name: 'owner',
        title: '持有人',
        callback: (item: ShippingLogWithDetails) => (
          <div className="flex flex-col">
            <span className="font-medium">{item.owner?.name || '-'}</span>
            <span className="text-sm text-muted-foreground">{item.owner?.email || '-'}</span>
          </div>
        ),
      },
      {
        name: 'address',
        title: '收货地址',
        callback: (item: ShippingLogWithDetails) => (
          <div className="text-sm">
            <div>{item.addressLine1}</div>
            <div className="text-muted-foreground">
              {item.city} {item.zipCode} {item.countryCode}
            </div>
          </div>
        ),
      },
      {
        name: 'feeStatus',
        title: '费用状态',
        callback: (item: ShippingLogWithDetails) => (
          <div className="flex flex-col gap-1">
            {getFeeStatusBadge(item.shippingFeeStatus)}
            {item.finalAmount && (
              <span className="text-sm text-muted-foreground">
                ${(item.finalAmount / 100).toFixed(2)}
              </span>
            )}
          </div>
        ),
      },
      {
        name: 'status',
        title: '物流状态',
        callback: (item: ShippingLogWithDetails) => getStatusBadge(item.status),
      },
      {
        name: 'tracking',
        title: '物流单号',
        callback: (item: ShippingLogWithDetails) => (
          <div className="flex flex-col gap-1">
            {item.trackingNumber ? (
              <>
                <span className="font-mono text-sm">{item.trackingNumber}</span>
                {item.carrier && (
                  <span className="text-xs text-muted-foreground">{item.carrier}</span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        ),
      },
      {
        name: 'requestedAt',
        title: '申请时间',
        type: 'time',
      },
      {
        name: 'actions',
        title: '操作',
        callback: (item: ShippingLogWithDetails) => (
          <div className="flex gap-2">
            {item.shippingFeeStatus === ShippingFeeStatus.NOT_REQUIRED && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedReq(item);
                  setModalType('payment');
                  setInputValue(item.estimatedAmount ? (item.estimatedAmount / 100).toFixed(2) : '15.00');
                }}
                className="gap-1"
              >
                <CreditCard size={14} />
                核算运费
              </Button>
            )}
            {item.shippingFeeStatus === ShippingFeeStatus.PENDING_PAYMENT && (
              <Badge variant="secondary" className="gap-1">
                <Clock size={12} />
                等待支付
              </Badge>
            )}
            {item.shippingFeeStatus === ShippingFeeStatus.PAID &&
              item.status !== ShippingStatus.SHIPPED && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    setSelectedReq(item);
                    setModalType('ship');
                    setInputValue(item.trackingNumber || '');
                  }}
                  className="gap-1"
                >
                  <Package size={14} />
                  确认发货
                </Button>
              )}
            {item.status === ShippingStatus.SHIPPED && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 size={12} />
                已发货
              </Badge>
            )}
          </div>
        ),
      },
    ],
    data: data,
    pagination: {
      total,
      page,
      limit,
    },
    emptyMessage: '暂无物流请求',
  };

  return (
    <>
      <TableCard table={table} />

      {/* 运费支付弹窗 */}
      <Dialog open={modalType === 'payment'} onOpenChange={(open) => !open && setModalType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发送运费账单</DialogTitle>
            <DialogDescription>
              系统将为受益人 <strong>{selectedReq?.beneficiary?.email || selectedReq?.receiverName}</strong>{' '}
              创建一个 Creem 支付链接，并通过邮件发送。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">运费金额 (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="15.00"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            {selectedReq?.beneficiary && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div>受益人：{selectedReq.beneficiary.name}</div>
                <div>邮箱：{selectedReq.beneficiary.email}</div>
                <div>地址：{selectedReq.addressLine1}, {selectedReq.city}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalType(null);
                setInputValue('');
                setSelectedReq(null);
              }}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button onClick={handleRequestPayment} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  发送支付邮件
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 确认发货弹窗 */}
      <Dialog open={modalType === 'ship'} onOpenChange={(open) => !open && setModalType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>录入物流单号</DialogTitle>
            <DialogDescription>
              确认发货后，系统将自动发送物流追踪信息给受益人。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tracking">物流单号</Label>
              <Input
                id="tracking"
                type="text"
                placeholder="SF1234567890"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            {selectedReq?.beneficiary && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div>受益人：{selectedReq.beneficiary.name}</div>
                <div>收货地址：{selectedReq.addressLine1}, {selectedReq.city}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalType(null);
                setInputValue('');
                setSelectedReq(null);
              }}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button onClick={handleConfirmShip} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  确认发货
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

