/**
 * 受益人表单组件
 * 功能：
 * - 基本信息输入（姓名、邮箱、关系）
 * - 地址信息输入（用于 ShipAny）
 * - 地址格式校验
 * - 语言选择
 * - 物理资产描述（Pro 版）
 * 
 * 核心原则：不改变 ShipAny 结构，仅收集地址信息
 */

'use client';

import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';

export interface BeneficiaryFormData {
  name: string;
  email: string;
  relationship: string;
  phone?: string;
  language: 'en' | 'zh' | 'fr';
  receiver_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  zip_code: string;
  country_code: string;
  physical_asset_description?: string;
}

interface BeneficiaryFormProps {
  vaultId: string;
  userPlan: 'free' | 'pro' | 'on_demand';
  onSave: (data: BeneficiaryFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<BeneficiaryFormData>;
}

export function BeneficiaryForm({
  vaultId,
  userPlan,
  onSave,
  onCancel,
  initialData,
}: BeneficiaryFormProps) {
  const [formData, setFormData] = useState<BeneficiaryFormData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    relationship: initialData?.relationship || 'friend',
    phone: initialData?.phone || '',
    language: initialData?.language || 'en',
    receiver_name: initialData?.receiver_name || '',
    address_line1: initialData?.address_line1 || '',
    address_line2: initialData?.address_line2 || '',
    city: initialData?.city || '',
    zip_code: initialData?.zip_code || '',
    country_code: initialData?.country_code || 'HKG',
    physical_asset_description: initialData?.physical_asset_description || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validateAddress = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 基本验证
    if (!formData.name.trim()) {
      newErrors.name = '姓名不能为空';
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }
    if (!formData.receiver_name.trim()) {
      newErrors.receiver_name = '收件人姓名不能为空';
    }
    if (!formData.address_line1.trim()) {
      newErrors.address_line1 = '地址不能为空';
    }
    if (!formData.city.trim()) {
      newErrors.city = '城市不能为空';
    }
    if (!formData.zip_code.trim()) {
      newErrors.zip_code = '邮编不能为空';
    }
    if (!formData.country_code.trim()) {
      newErrors.country_code = '国家代码不能为空';
    }

    // 地址格式验证（用于 ShipAny）
    // 注意：不改变 ShipAny 结构，仅验证格式是否符合 ShipAny 要求
    if (formData.country_code.length !== 3) {
      newErrors.country_code = '国家代码必须是 3 位（如 HKG, USA, CHN）';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAddress()) {
      toast.error('请检查表单错误');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      toast.success('受益人已添加');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本信息 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Basic Information
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Beneficiary name"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="beneficiary@example.com"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Relationship
            </label>
            <select
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="family">Family</option>
              <option value="friend">Friend</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="parent">Parent</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Language
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value as 'en' | 'zh' | 'fr' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone (Optional)
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="+1-234-567-8900"
          />
        </div>
      </div>

      {/* 地址信息（用于 ShipAny） */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Shipping Address
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Address information for physical asset delivery (Pro version)
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Receiver Name *
          </label>
          <input
            type="text"
            value={formData.receiver_name}
            onChange={(e) => setFormData({ ...formData, receiver_name: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.receiver_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Receiver name"
          />
          {errors.receiver_name && (
            <p className="mt-1 text-sm text-red-600">{errors.receiver_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Address Line 1 *
          </label>
          <input
            type="text"
            value={formData.address_line1}
            onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.address_line1 ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Street address"
          />
          {errors.address_line1 && (
            <p className="mt-1 text-sm text-red-600">{errors.address_line1}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Address Line 2 (Optional)
          </label>
          <input
            type="text"
            value={formData.address_line2}
            onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Apartment, suite, etc."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              City *
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.city ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="City"
            />
            {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ZIP Code *
            </label>
            <input
              type="text"
              value={formData.zip_code}
              onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.zip_code ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="000000"
            />
            {errors.zip_code && <p className="mt-1 text-sm text-red-600">{errors.zip_code}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Country Code *
          </label>
          <input
            type="text"
            value={formData.country_code}
            onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.country_code ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="HKG"
            maxLength={3}
          />
          {errors.country_code && (
            <p className="mt-1 text-sm text-red-600">{errors.country_code}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            3-letter country code (e.g., HKG, USA, CHN)
          </p>
        </div>
      </div>

      {/* 物理资产描述（Pro 版） */}
      {userPlan === 'pro' && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Physical Asset Description (Pro)
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.physical_asset_description}
              onChange={(e) => setFormData({ ...formData, physical_asset_description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              placeholder="e.g., Encrypted Recovery Kit - Physical USB Drive"
            />
            <p className="mt-1 text-xs text-gray-500">
              Describe the physical asset that will be shipped to this beneficiary
            </p>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
        >
          <X className="w-4 h-4" />
          <span>Cancel</span>
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Beneficiary'}</span>
        </button>
      </div>
    </form>
  );
}



