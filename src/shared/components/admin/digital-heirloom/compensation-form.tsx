/**
 * Compensation Form Component
 * 补偿操作表单组件
 * 
 * 功能：执行补偿操作，支持选择邮件模板
 */

'use client';

import React, { useState } from 'react';
import { Gift, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

interface VaultListItem {
  id: string;
  userEmail: string;
  planLevel: 'free' | 'base' | 'pro';
  actionType?: 'EXTEND_SUBSCRIPTION' | 'RESET_DECRYPTION_COUNT' | 'ADD_DECRYPTION_COUNT' | 'ADD_BONUS_DECRYPTION_COUNT';
}

interface CompensationFormProps {
  vault: VaultListItem;
  onClose: () => void;
  onSuccess: () => void;
}

const EMAIL_TEMPLATES = {
  system_failure: {
    name: '系统故障补偿',
    subject: '系统故障补偿通知',
    message: '由于系统故障，我们已为您延长订阅期限。',
  },
  anniversary: {
    name: '周年庆福利',
    subject: '周年庆特别福利',
    message: '感谢您的支持！我们为您提供特别福利。',
  },
  manual_extension: {
    name: '手动延期',
    subject: '订阅延期通知',
    message: '您的订阅期限已延长。',
  },
  customer_service: {
    name: '客服补偿',
    subject: '客服补偿通知',
    message: '由于服务问题，我们已为您提供补偿。',
  },
};

export function CompensationForm({ vault, onClose, onSuccess }: CompensationFormProps) {
  const [actionType, setActionType] = useState<string>(
    vault.actionType || 'EXTEND_SUBSCRIPTION'
  );
  const [value, setValue] = useState<string>('30');
  const [reason, setReason] = useState<string>('');
  const [emailTemplate, setEmailTemplate] = useState<string>('customer_service');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('请填写补偿原因');
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        type: actionType,
        reason: reason.trim(),
      };

      if (actionType === 'EXTEND_SUBSCRIPTION' || actionType === 'ADD_DECRYPTION_COUNT' || actionType === 'ADD_BONUS_DECRYPTION_COUNT') {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue <= 0) {
          alert('请输入有效的数值');
          setLoading(false);
          return;
        }
        body.value = numValue;
      }

      // 添加邮件模板信息（如果需要）
      if (emailTemplate) {
        const template = EMAIL_TEMPLATES[emailTemplate as keyof typeof EMAIL_TEMPLATES];
        if (template) {
          body.emailTemplate = emailTemplate;
          body.emailSubject = template.subject;
          body.emailMessage = template.message;
        }
      }

      const res = await fetch(`/api/admin/digital-heirloom/vaults/${vault.id}/grant-compensation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.code === 0) {
        alert('补偿操作成功！');
        onSuccess();
      } else {
        alert(`操作失败：${data.message}`);
      }
    } catch (error: any) {
      console.error('Compensation failed:', error);
      alert(`操作失败：${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            补偿操作
          </DialogTitle>
          <DialogDescription>
            为用户 {vault.userEmail} 执行补偿操作
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 补偿类型 */}
          <div>
            <Label>补偿类型</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXTEND_SUBSCRIPTION">延长订阅期限</SelectItem>
                <SelectItem value="RESET_DECRYPTION_COUNT">重置解密次数</SelectItem>
                <SelectItem value="ADD_DECRYPTION_COUNT">增加解密次数</SelectItem>
                <SelectItem value="ADD_BONUS_DECRYPTION_COUNT">增加赠送解密次数</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 补偿值 */}
          {(actionType === 'EXTEND_SUBSCRIPTION' || 
            actionType === 'ADD_DECRYPTION_COUNT' || 
            actionType === 'ADD_BONUS_DECRYPTION_COUNT') && (
            <div>
              <Label>
                {actionType === 'EXTEND_SUBSCRIPTION' ? '延长天数' : '增加次数'}
              </Label>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                min="1"
                required
              />
            </div>
          )}

          {/* 邮件模板选择 */}
          <div>
            <Label>邮件模板</Label>
            <Select value={emailTemplate} onValueChange={setEmailTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
                  <SelectItem key={key} value={key}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {emailTemplate && (
              <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                <div className="font-medium">主题：{EMAIL_TEMPLATES[emailTemplate as keyof typeof EMAIL_TEMPLATES]?.subject}</div>
                <div className="text-gray-600 mt-1">
                  {EMAIL_TEMPLATES[emailTemplate as keyof typeof EMAIL_TEMPLATES]?.message}
                </div>
              </div>
            )}
          </div>

          {/* 补偿原因 */}
          <div>
            <Label>补偿原因 <span className="text-red-500">*</span></Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请详细说明补偿原因，这将记录到审计日志中"
              rows={4}
              required
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '处理中...' : '确认补偿'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
