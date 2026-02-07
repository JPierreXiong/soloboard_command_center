/**
 * 支付成功页面
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Download, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchPaymentInfo();
    }
  }, [sessionId]);

  const fetchPaymentInfo = async () => {
    try {
      const response = await fetch(
        `/api/payment/create?sessionId=${sessionId}&provider=stripe`
      );
      const data = await response.json();
      
      if (data.success) {
        setPaymentInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch payment info:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4"
            >
              <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
            </motion.div>

            <CardTitle className="text-3xl text-green-700 dark:text-green-400">
              支付成功！
            </CardTitle>
            <CardDescription className="text-base">
              感谢您的购买，您的订单已确认
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 支付信息 */}
            {!loading && paymentInfo && (
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">订单号</span>
                  <span className="font-mono">{sessionId?.slice(0, 20)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">支付金额</span>
                  <span className="font-semibold">
                    {paymentInfo.paymentInfo?.paymentAmount 
                      ? `$${(paymentInfo.paymentInfo.paymentAmount / 100).toFixed(2)}`
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">支付状态</span>
                  <span className="text-green-600 font-semibold">已完成</span>
                </div>
              </div>
            )}

            {/* 下一步操作 */}
            <div className="space-y-3">
              <h4 className="font-semibold">接下来您可以：</h4>
              
              <div className="grid gap-3">
                <Link href="/dashboard">
                  <Button className="w-full" size="lg">
                    <ArrowRight className="mr-2 h-5 w-5" />
                    前往控制台
                  </Button>
                </Link>

                <Button variant="outline" className="w-full" size="lg">
                  <Download className="mr-2 h-5 w-5" />
                  下载发票
                </Button>

                <Button variant="outline" className="w-full" size="lg">
                  <Mail className="mr-2 h-5 w-5" />
                  查看确认邮件
                </Button>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="text-center text-sm text-muted-foreground pt-4 border-t">
              <p>确认邮件已发送至您的邮箱</p>
              <p className="mt-1">如有问题，请联系客服</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

