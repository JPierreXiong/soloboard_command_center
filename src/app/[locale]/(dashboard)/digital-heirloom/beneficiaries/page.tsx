/**
 * Digital Heirloom Beneficiaries 页面
 * 受益人管理页面
 */

'use client';

import { useEffect, useState } from 'react';
import { Plus, Users, Mail, Phone, MapPin, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { BeneficiaryForm } from '@/shared/components/digital-heirloom/beneficiary-form';

interface Beneficiary {
  id: string;
  name: string;
  email: string;
  relationship: string;
  phone?: string;
  language: string;
  receiver_name?: string;
  address_line1?: string;
  city?: string;
  country_code?: string;
  status: 'pending' | 'notified' | 'released';
  created_at: string;
}

export default function DigitalHeirloomBeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'on_demand'>('pro');

  useEffect(() => {
    loadBeneficiaries();
  }, []);

  const loadBeneficiaries = async () => {
    try {
      // 1. 获取保险箱信息
      const vaultResponse = await fetch('/api/digital-heirloom/vault/get');
      const vaultResult = await vaultResponse.json();

      if (vaultResult.code !== 200 || !vaultResult.data?.vault) {
        toast.error('保险箱未找到，请先创建保险箱');
        return;
      }

      const vault = vaultResult.data.vault;
      setVaultId(vault.id);

      // TODO: 获取用户套餐信息
      setUserPlan('pro'); // 临时值

      // 2. 获取受益人列表
      const beneficiariesResponse = await fetch('/api/digital-heirloom/beneficiaries/list');
      const beneficiariesResult = await beneficiariesResponse.json();

      if (beneficiariesResult.code === 200 && beneficiariesResult.data?.beneficiaries) {
        setBeneficiaries(beneficiariesResult.data.beneficiaries.map((b: any) => ({
          id: b.id,
          name: b.name,
          email: b.email,
          relationship: b.relationship || 'friend',
          phone: b.phone,
          language: b.language || 'en',
          receiver_name: b.receiverName,
          address_line1: b.addressLine1,
          city: b.city,
          country_code: b.countryCode,
          status: b.status || 'pending',
          created_at: b.createdAt,
        })));
      } else {
        setBeneficiaries([]);
      }
    } catch (error) {
      console.error('加载受益人数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个受益人吗？')) return;

    try {
      const response = await fetch('/api/digital-heirloom/beneficiaries/remove', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ beneficiary_id: id }),
      });

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(result.message || '删除受益人失败');
      }

      toast.success('受益人已删除');
      await loadBeneficiaries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      notified: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      released: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和操作栏 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Beneficiaries</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage trusted contacts who will receive your digital legacy
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Beneficiary</span>
          </button>
        </div>

        {/* 添加受益人表单 */}
        {showAddForm && vaultId && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add New Beneficiary
            </h2>
            <BeneficiaryForm
              vaultId={vaultId}
              userPlan={userPlan}
              onSave={async (data) => {
                try {
                  const response = await fetch('/api/digital-heirloom/beneficiaries/add', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      beneficiary: {
                        name: data.name,
                        email: data.email,
                        relationship: data.relationship,
                        language: data.language,
                        phone: data.phone,
                        receiverName: data.receiver_name,
                        addressLine1: data.address_line1,
                        addressLine2: data.address_line2,
                        city: data.city,
                        zipCode: data.zip_code,
                        countryCode: data.country_code,
                      },
                    }),
                  });

                  const result = await response.json();

                  if (result.code !== 200) {
                    throw new Error(result.message || '保存受益人失败');
                  }

                  toast.success('受益人已添加');
                  setShowAddForm(false);
                  await loadBeneficiaries();
                } catch (error) {
                  throw error;
                }
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {/* 受益人列表 */}
        {beneficiaries.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No beneficiaries yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add trusted contacts who will receive your digital legacy.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Add Your First Beneficiary
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {beneficiaries.map((beneficiary) => (
              <div
                key={beneficiary.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {beneficiary.name}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">{beneficiary.relationship}</p>
                    </div>
                  </div>
                  {getStatusBadge(beneficiary.status)}
                </div>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>{beneficiary.email}</span>
                  </div>
                  {beneficiary.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>{beneficiary.phone}</span>
                    </div>
                  )}
                  {beneficiary.address_line1 && (
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <div>
                        <div>{beneficiary.address_line1}</div>
                        {beneficiary.city && (
                          <div className="text-gray-500">
                            {beneficiary.city}, {beneficiary.country_code}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500">Language: </span>
                    <span className="text-xs font-medium">{beneficiary.language.toUpperCase()}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center space-x-2">
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(beneficiary.id)}
                    className="px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

