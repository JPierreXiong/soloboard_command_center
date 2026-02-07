/**
 * ShipAny Simulator - 物流模拟器
 * 
 * 功能：
 * 1. 模拟物流状态
 * 2. 显示物流进度
 * 3. 生成面单预览
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ShipAnySimulatorProps {
  vaultId: string;
  beneficiaryId?: string;
  onClose?: () => void;
}

interface ShippingStatus {
  phase: 'processing' | 'preparing' | 'dispatched' | 'in_transit' | 'delivered';
  trackingNumber: string;
  courier: string;
  estimatedDelivery: string;
}

export function ShipAnySimulator({ vaultId, beneficiaryId, onClose }: ShipAnySimulatorProps) {
  const [status, setStatus] = useState<ShippingStatus | null>(null);
  const [showWaybill, setShowWaybill] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 自动开始模拟流程
    startSimulation();
  }, []);

  const startSimulation = async () => {
    setLoading(true);
    
    // Phase 1: Processing
    setStatus({
      phase: 'processing',
      trackingNumber: '',
      courier: '',
      estimatedDelivery: '',
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Phase 2: Preparing
    setStatus({
      phase: 'preparing',
      trackingNumber: '',
      courier: '',
      estimatedDelivery: '',
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Phase 3: Dispatched
    const trackingNumber = `SA-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    setStatus({
      phase: 'dispatched',
      trackingNumber,
      courier: 'DHL Express',
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    });
    
    setLoading(false);
    toast.success('Physical package dispatched!');
  };

  const getPhaseInfo = () => {
    if (!status) return null;

    switch (status.phase) {
      case 'processing':
        return {
          title: 'Encrypting Hardware Key...',
          description: 'Physical medium is being prepared with encrypted recovery fragment',
          icon: <Package className="w-6 h-6" />,
          color: 'text-blue-400',
        };
      case 'preparing':
        return {
          title: 'Package Preparation',
          description: 'Secure hardware key is being packaged for shipment',
          icon: <Package className="w-6 h-6" />,
          color: 'text-yellow-400',
        };
      case 'dispatched':
        return {
          title: 'Courier Picked Up',
          description: `Tracking: ${status.trackingNumber}`,
          icon: <Truck className="w-6 h-6" />,
          color: 'text-green-400',
        };
      case 'in_transit':
        return {
          title: 'In Transit',
          description: 'Package is on the way to beneficiary',
          icon: <Truck className="w-6 h-6" />,
          color: 'text-blue-400',
        };
      case 'delivered':
        return {
          title: 'Delivered',
          description: 'Package has been delivered to beneficiary',
          icon: <CheckCircle className="w-6 h-6" />,
          color: 'text-green-500',
        };
      default:
        return null;
    }
  };

  const generateWaybill = () => {
    if (!status) return null;

    return {
      trackingNumber: status.trackingNumber,
      courier: status.courier,
      sender: {
        name: 'Digital Heirloom Vault',
        address: 'Your Warehouse Address',
        city: 'Hong Kong',
        zipCode: '000000',
        country: 'HKG',
      },
      recipient: {
        name: 'Beneficiary Name',
        address: 'Beneficiary Address',
        city: 'Beneficiary City',
        zipCode: '000000',
        country: 'HKG',
      },
      contents: 'Encrypted Digital Inheritance Drive',
      weight: '0.5 kg',
      estimatedDelivery: status.estimatedDelivery,
    };
  };

  const phaseInfo = getPhaseInfo();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border-2 border-[#EAB308] rounded-2xl shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="p-6 border-b border-[#EAB308]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#EAB308]/20 rounded-lg">
                <Package className="w-6 h-6 text-[#EAB308]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">ShipAny Physical Fulfillment</h2>
                <p className="text-sm text-neutral-400">Pro Member - Physical Recovery Medium</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {status && phaseInfo ? (
            <>
              {/* Status Display */}
              <div className="space-y-4">
                <div className={`flex items-center gap-4 p-4 bg-neutral-800 rounded-lg ${phaseInfo.color}`}>
                  {phaseInfo.icon}
                  <div className="flex-1">
                    <p className="font-bold text-lg">{phaseInfo.title}</p>
                    <p className="text-sm opacity-80">{phaseInfo.description}</p>
                  </div>
                </div>

                {/* Progress Indicators */}
                <div className="flex items-center gap-2">
                  <div className={`flex-1 h-2 rounded-full ${status.phase !== 'processing' ? 'bg-[#EAB308]' : 'bg-neutral-700'}`}></div>
                  <div className={`flex-1 h-2 rounded-full ${status.phase === 'dispatched' || status.phase === 'in_transit' || status.phase === 'delivered' ? 'bg-[#EAB308]' : 'bg-neutral-700'}`}></div>
                  <div className={`flex-1 h-2 rounded-full ${status.phase === 'delivered' ? 'bg-[#EAB308]' : 'bg-neutral-700'}`}></div>
                </div>
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Processing</span>
                  <span>Dispatched</span>
                  <span>Delivered</span>
                </div>

                {/* Tracking Info */}
                {status.trackingNumber && (
                  <div className="bg-[#EAB308]/5 border border-[#EAB308]/20 rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Tracking Number:</span>
                        <span className="text-[#EAB308] font-mono font-bold">{status.trackingNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Courier:</span>
                        <span className="text-white">{status.courier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Estimated Delivery:</span>
                        <span className="text-white">{status.estimatedDelivery}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Waybill Preview Button */}
              {status.phase === 'dispatched' && (
                <button
                  onClick={() => setShowWaybill(true)}
                  className="w-full py-3 bg-[#EAB308] hover:bg-[#D4AF37] text-black font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Digital Waybill
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#EAB308] mb-4"></div>
              <p className="text-neutral-400">Initializing shipment...</p>
            </div>
          )}
        </div>
      </div>

      {/* Waybill Modal */}
      {showWaybill && status && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-black mb-2">Digital Waybill</h3>
              <div className="h-1 bg-[#EAB308] w-20"></div>
            </div>

            <div className="space-y-6 text-black">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold mb-2">Sender</h4>
                  <p className="text-sm">Digital Heirloom Vault</p>
                  <p className="text-sm">Your Warehouse Address</p>
                  <p className="text-sm">Hong Kong, 000000</p>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Recipient</h4>
                  <p className="text-sm">Beneficiary Name</p>
                  <p className="text-sm">Beneficiary Address</p>
                  <p className="text-sm">Beneficiary City, 000000</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">Tracking Number:</span>
                    <span className="font-mono">{status.trackingNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Contents:</span>
                    <span>Encrypted Digital Inheritance Drive</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Weight:</span>
                    <span>0.5 kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Estimated Delivery:</span>
                    <span>{status.estimatedDelivery}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowWaybill(false)}
                  className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-black font-semibold rounded-lg transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // TODO: 生成 PDF 面单
                    toast.info('PDF waybill generation coming soon...');
                  }}
                  className="flex-1 py-2 bg-[#EAB308] hover:bg-[#D4AF37] text-black font-semibold rounded-lg transition-all"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
