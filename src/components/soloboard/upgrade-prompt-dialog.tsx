/**
 * 升级提示对话框
 * 当用户达到站点限制时显示
 */

'use client';

import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';

interface UpgradePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  currentCount: number;
  limit: number;
}

export function UpgradePromptDialog({
  open,
  onOpenChange,
  currentPlan,
  currentCount,
  limit,
}: UpgradePromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">升级以添加更多站点</DialogTitle>
          <DialogDescription className="text-base">
            您的 {currentPlan} 套餐已达到 {limit} 个站点的限制
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 当前状态 */}
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">当前限制</h3>
            </div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              已使用 <span className="font-bold text-lg">{currentCount}</span> / {limit} 个站点配额
            </p>
            <div className="mt-2 w-full bg-yellow-200 dark:bg-yellow-900 rounded-full h-2">
              <div
                className="bg-yellow-600 dark:bg-yellow-500 h-2 rounded-full transition-all"
                style={{ width: `${(currentCount / limit) * 100}%` }}
              />
            </div>
          </div>

          {/* 套餐对比 */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Base Plan */}
            <Card className="border-2 border-blue-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-3 py-1 rounded-bl-lg">
                推荐
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Base Plan</CardTitle>
                <CardDescription>适合小型项目和个人开发者</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    $19.9
                    <span className="text-lg font-normal text-muted-foreground">/月</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">按月计费，随时取消</p>
                </div>

                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>最多 5 个站点</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>实时监控和告警</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>邮件通知</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>收入和流量统计</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>1000 积分/月</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>7天数据历史</span>
                  </li>
                </ul>

                <Button className="w-full" size="lg" asChild>
                  <a href="/pricing">
                    立即升级
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-2 border-purple-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs px-3 py-1 rounded-bl-lg">
                最强大
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Pro Plan</CardTitle>
                <CardDescription>适合专业用户和团队</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                    $39.9
                    <span className="text-lg font-normal text-muted-foreground">/月</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">按月计费，随时取消</p>
                </div>

                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>无限站点</strong> 🚀</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>全部 Base 功能</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>高级分析和报告</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>API 访问权限</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>5000 积分/月</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>90天数据历史</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>优先技术支持</span>
                  </li>
                </ul>

                <Button className="w-full" size="lg" variant="outline" asChild>
                  <a href="/pricing">
                    立即升级
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 对比表格 */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-semibold">功能</th>
                  <th className="text-center p-3 font-semibold">Free</th>
                  <th className="text-center p-3 font-semibold bg-blue-50 dark:bg-blue-950">Base</th>
                  <th className="text-center p-3 font-semibold bg-purple-50 dark:bg-purple-950">Pro</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-3">站点数量</td>
                  <td className="text-center p-3">1</td>
                  <td className="text-center p-3 bg-blue-50 dark:bg-blue-950 font-semibold">5</td>
                  <td className="text-center p-3 bg-purple-50 dark:bg-purple-950 font-semibold">无限</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3">邮件告警</td>
                  <td className="text-center p-3">❌</td>
                  <td className="text-center p-3 bg-blue-50 dark:bg-blue-950">✅</td>
                  <td className="text-center p-3 bg-purple-50 dark:bg-purple-950">✅</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3">API 访问</td>
                  <td className="text-center p-3">❌</td>
                  <td className="text-center p-3 bg-blue-50 dark:bg-blue-950">❌</td>
                  <td className="text-center p-3 bg-purple-50 dark:bg-purple-950">✅</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3">数据历史</td>
                  <td className="text-center p-3">3天</td>
                  <td className="text-center p-3 bg-blue-50 dark:bg-blue-950">7天</td>
                  <td className="text-center p-3 bg-purple-50 dark:bg-purple-950">90天</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 底部提示 */}
          <div className="text-center text-sm text-muted-foreground">
            <p>💡 所有套餐都支持随时取消，无需长期承诺</p>
            <p className="mt-1">有问题？<a href="/contact" className="text-primary hover:underline">联系我们</a></p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

