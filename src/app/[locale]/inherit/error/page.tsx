/**
 * Beneficiary Inheritance Error Page
 * 受益人访问错误页面
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { AlertCircle, Home, Mail } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';

export default function BeneficiaryInheritanceErrorPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'Unknown error';

  const getErrorMessage = (reason: string) => {
    if (reason.includes('expired')) {
      return {
        title: 'Token 已过期',
        description: '您的访问令牌已过期。请联系遗产委托人获取新的访问链接。',
        icon: AlertCircle,
      };
    }
    if (reason.includes('Invalid') || reason.includes('invalid')) {
      return {
        title: '无效的访问令牌',
        description: '您提供的访问令牌无效。请检查邮件中的链接是否正确。',
        icon: AlertCircle,
      };
    }
    if (reason.includes('not found')) {
      return {
        title: '未找到相关信息',
        description: '无法找到对应的遗产信息。请联系遗产委托人或系统管理员。',
        icon: AlertCircle,
      };
    }
    return {
      title: '访问错误',
      description: reason || '发生了未知错误，请稍后重试。',
      icon: AlertCircle,
    };
  };

  const errorInfo = getErrorMessage(reason);
  const Icon = errorInfo.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <Icon className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">{errorInfo.title}</CardTitle>
          <CardDescription className="mt-2">{errorInfo.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>错误代码：</strong>
              <code className="ml-2 text-xs">{reason}</code>
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="mailto:support@example.com">
                <Mail className="mr-2 h-4 w-4" />
                联系支持
              </Link>
            </Button>
          </div>

          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            <p>如果您认为这是一个错误，请联系遗产委托人或系统管理员。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
