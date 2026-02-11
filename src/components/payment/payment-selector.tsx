/**
 * SoloBoard - 支付方式选择组件
 * 
 * 功能：美观的支付方式选择界面
 * 支持：Stripe、PayPal、支付宝
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Label } from '@/shared/components/ui/label';
import { 
  CreditCard, 
  Wallet, 
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Shield,
  Zap,
  Globe
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// 支付方式配置
const PAYMENT_METHODS = [
  {
    id: 'creem',
    name: 'Creem',
    icon: CreditCard,
    color: 'from-emerald-500 to-teal-500',
    description: '信用卡、借记卡支付',
    features: [
      '支持全球支付',
      '安全快速结账',
      '订阅管理',
      'PCI DSS 认证'
    ],
    currencies: ['USD', 'CNY', 'EUR', 'GBP', 'JPY'],
    fee: '2.9% + $0.30',
    popular: true,
    recommended: true
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: CreditCard,
    color: 'from-purple-500 to-indigo-500',
    description: '信用卡、微信、支付宝',
    features: [
      '支持全球 135+ 种货币',
      '信用卡、借记卡支付',
      '微信支付、支付宝',
      '安全加密，PCI 认证'
    ],
    currencies: ['USD', 'CNY', 'EUR', 'GBP', 'JPY'],
    fee: '2.9% + $0.30',
    popular: true,
    recommended: false
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: Wallet,
    color: 'from-blue-500 to-cyan-500',
    description: 'PayPal 账户支付',
    features: [
      '全球 4 亿+ 用户',
      '支持 200+ 个国家',
      '买家保护计划',
      '即时到账'
    ],
    currencies: ['USD', 'EUR', 'GBP', 'AUD', 'CAD'],
    fee: '2.9% + $0.30',
    popular: true,
    recommended: false
  },
  {
    id: 'alipay',
    name: '支付宝',
    icon: Smartphone,
    color: 'from-blue-400 to-blue-600',
    description: '支付宝扫码支付',
    features: [
      '中国 10 亿+ 用户',
      '扫码即时支付',
      '低手续费 0.6%',
      '即时到账'
    ],
    currencies: ['CNY'],
    fee: '0.6% - 1.2%',
    popular: true,
    recommended: false
  }
];

interface PaymentSelectorProps {
  amount: number;
  currency: string;
  productId?: string;
  planName?: string;
  onPaymentSelect?: (provider: string) => void;
}

export function PaymentSelector({ 
  amount, 
  currency = 'USD',
  productId,
  planName,
  onPaymentSelect 
}: PaymentSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('creem');
  const [loading, setLoading] = useState(false);

  // 过滤支持当前货币的支付方式
  const availableMethods = PAYMENT_METHODS.filter(method => 
    method.currencies.includes(currency.toUpperCase())
  );

  const handlePayment = async () => {
    setLoading(true);

    try {
      const payload: any = {
        amount,
        currency: currency.toLowerCase(),
        provider: selectedMethod,
        type: 'subscription'
      };

      // 如果使用 Creem，添加产品 ID
      if (selectedMethod === 'creem' && productId) {
        payload.productId = productId;
        payload.plan = {
          name: planName || 'SoloBoard Subscription'
        };
      }

      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        // 跳转到支付页面
        window.location.href = data.checkoutUrl;
      } else {
        toast.error(data.error || '创建支付失败');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$',
      CNY: '¥',
      EUR: '€',
      GBP: '£',
      JPY: '¥'
    };

    const symbol = symbols[currency.toUpperCase()] || currency;
    const value = (amount / 100).toFixed(2);

    return `${symbol}${value}`;
  };

  return (
    <div className="space-y-6">
      {/* 支付金额显示 */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">支付金额</p>
            <p className="text-4xl font-bold">{formatAmount(amount, currency)}</p>
          </div>
        </CardContent>
      </Card>

      {/* 支付方式选择 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">选择支付方式</h3>
          <Badge variant="secondary" className="gap-1">
            <Shield className="h-3 w-3" />
            安全支付
          </Badge>
        </div>

        <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
          <div className="grid gap-4">
            {availableMethods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                selected={selectedMethod === method.id}
                onSelect={() => setSelectedMethod(method.id)}
              />
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* 支付按钮 */}
      <Button
        onClick={handlePayment}
        disabled={loading || !selectedMethod}
        className="w-full h-12 text-base"
        size="lg"
      >
        {loading ? (
          '处理中...'
        ) : (
          <>
            <Zap className="mr-2 h-5 w-5" />
            立即支付 {formatAmount(amount, currency)}
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>

      {/* 安全提示 */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>所有支付均通过 SSL 加密传输</span>
      </div>
    </div>
  );
}

// 支付方式卡片组件
function PaymentMethodCard({ 
  method, 
  selected, 
  onSelect 
}: { 
  method: typeof PAYMENT_METHODS[0]; 
  selected: boolean; 
  onSelect: () => void;
}) {
  const Icon = method.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={`cursor-pointer transition-all ${
          selected
            ? 'border-primary ring-2 ring-primary shadow-lg'
            : 'hover:border-primary/50'
        }`}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* 单选按钮 */}
            <RadioGroupItem value={method.id} id={method.id} className="mt-1" />

            {/* 图标 */}
            <div className={`p-3 rounded-lg bg-gradient-to-br ${method.color} shrink-0`}>
              <Icon className="h-6 w-6 text-white" />
            </div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Label htmlFor={method.id} className="text-base font-semibold cursor-pointer">
                  {method.name}
                </Label>
                {method.recommended && (
                  <Badge variant="default" className="text-xs">
                    推荐
                  </Badge>
                )}
                {method.popular && (
                  <Badge variant="secondary" className="text-xs">
                    热门
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {method.description}
              </p>

              {/* 功能列表 */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {method.features.slice(0, 4).map((feature, index) => (
                  <div key={index} className="flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                    <span className="truncate">{feature}</span>
                  </div>
                ))}
              </div>

              {/* 底部信息 */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  <span>{method.currencies.join(', ')}</span>
                </div>
                <span>手续费: {method.fee}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// 简化版支付按钮（用于快速集成）
export function QuickPaymentButton({
  amount,
  currency = 'USD',
  provider = 'stripe',
  label,
  className
}: {
  amount: number;
  currency?: string;
  provider?: 'stripe' | 'paypal' | 'alipay';
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          currency: currency.toLowerCase(),
          provider
        })
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error(data.error || '创建支付失败');
      }
    } catch (error) {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const providerNames = {
    stripe: 'Stripe',
    paypal: 'PayPal',
    alipay: '支付宝'
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={loading}
      className={className}
    >
      {loading ? '处理中...' : (label || `使用 ${providerNames[provider]} 支付`)}
    </Button>
  );
}

// 支付方式图标列表（用于展示支持的支付方式）
export function PaymentMethodIcons({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>支持:</span>
      </div>
      {PAYMENT_METHODS.map((method) => {
        const Icon = method.icon;
        return (
          <div
            key={method.id}
            className={`p-2 rounded-lg bg-gradient-to-br ${method.color}`}
            title={method.name}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
        );
      })}
    </div>
  );
}

