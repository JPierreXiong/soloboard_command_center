/**
 * Batch Compensation Form Component
 * 批量补偿表单组件
 * 
 * 功能：Super Admin 批量补偿多个金库
 */

'use client';

import React, { useState } from 'react';
import { Gift, Upload, FileText, AlertCircle } from 'lucide-react';
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
import { Badge } from '@/shared/components/ui/badge';

interface BatchCompensationFormProps {
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

export function BatchCompensationForm({ onSuccess }: BatchCompensationFormProps) {
  const [open, setOpen] = useState(false);
  const [actionType, setActionType] = useState<string>('EXTEND_SUBSCRIPTION');
  const [value, setValue] = useState<string>('30');
  const [vaultIds, setVaultIds] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [emailTemplate, setEmailTemplate] = useState<string>('customer_service');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('请填写补偿原因');
      return;
    }

    const ids = vaultIds.split('\n').map(id => id.trim()).filter(id => id.length > 0);
    if (ids.length === 0) {
      alert('请至少输入一个 Vault ID');
      return;
    }

    if (ids.length > 100) {
      alert('最多支持 100 个金库批量操作');
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const body: any = {
        type: actionType,
        vaultIds: ids,
        reason: reason.trim(),
      };

      if (actionType === 'EXTEND_SUBSCRIPTION') {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue <= 0) {
          alert('请输入有效的天数');
          setLoading(false);
          return;
        }
        body.value = numValue;
      }

      if (emailTemplate) {
        body.emailTemplate = emailTemplate;
      }

      const res = await fetch('/api/admin/digital-heirloom/vaults/batch-compensate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.code === 0) {
        setResult(data.data);
        if (data.data.failed === 0) {
          setTimeout(() => {
            setOpen(false);
            setResult(null);
            setVaultIds('');
            setReason('');
            onSuccess();
          }, 3000);
        }
      } else {
        alert(`操作失败：${data.message}`);
      }
    } catch (error: any) {
      console.error('Batch compensation failed:', error);
      alert(`操作失败：${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <Gift className="h-4 w-4 mr-2" />
        批量补偿
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              批量补偿操作
            </DialogTitle>
            <DialogDescription>
              Super Admin 批量补偿功能（最多 100 个金库）
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">批量操作完成</span>
                </div>
                <div className="text-sm text-green-700">
                  <div>总计: {result.total}</div>
                  <div>成功: {result.success}</div>
                  <div>失败: {result.failed}</div>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded">
                  <div className="font-semibold text-red-800 mb-2">失败记录</div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {result.errors.map((error: any, index: number) => (
                      <div key={index} className="text-sm text-red-700">
                        {error.vaultId}: {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.results && result.results.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <div className="font-semibold text-blue-800 mb-2">成功记录（前 10 条）</div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {result.results.slice(0, 10).map((r: any, index: number) => (
                      <div key={index} className="text-sm text-blue-700">
                        {r.vaultId}: {r.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => {
                  setOpen(false);
                  setResult(null);
                  setVaultIds('');
                  setReason('');
                  onSuccess();
                }}>
                  关闭
                </Button>
              </div>
            </div>
          ) : (
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
                  </SelectContent>
                </Select>
              </div>

              {/* 补偿值 */}
              {actionType === 'EXTEND_SUBSCRIPTION' && (
                <div>
                  <Label>延长天数</Label>
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    min="1"
                    required
                  />
                </div>
              )}

              {/* Vault IDs 输入 */}
              <div>
                <Label>
                  Vault IDs <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">（每行一个，最多 100 个）</span>
                </Label>
                <Textarea
                  value={vaultIds}
                  onChange={(e) => setVaultIds(e.target.value)}
                  placeholder="请输入 Vault ID，每行一个&#10;例如：&#10;vault-id-1&#10;vault-id-2&#10;vault-id-3"
                  rows={8}
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  已输入: {vaultIds.split('\n').filter(id => id.trim().length > 0).length} 个
                </div>
              </div>

              {/* 邮件模板选择 */}
              <div>
                <Label>邮件模板（可选）</Label>
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
              </div>

              {/* 补偿原因 */}
              <div>
                <Label>补偿原因 <span className="text-red-500">*</span></Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="请详细说明批量补偿原因，这将记录到审计日志中"
                  rows={4}
                  required
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? '处理中...' : '确认批量补偿'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
