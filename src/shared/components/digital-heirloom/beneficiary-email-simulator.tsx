/**
 * Beneficiary Email Simulator - 受益人邮件模拟器
 * 
 * 功能：
 * 1. 模拟受益人收到的通知邮件
 * 2. 显示 Release Token
 * 3. 一键填充 Token
 */

'use client';

import React from 'react';
import { Mail, Copy, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface BeneficiaryEmailSimulatorProps {
  releaseToken: string;
  beneficiaryName?: string;
  onUseToken?: (token: string) => void;
  onClose?: () => void;
}

export function BeneficiaryEmailSimulator({
  releaseToken,
  beneficiaryName = 'Beneficiary',
  onUseToken,
  onClose,
}: BeneficiaryEmailSimulatorProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(releaseToken);
    setCopied(true);
    toast.success('Token copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseToken = () => {
    onUseToken?.(releaseToken);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Email Header */}
        <div className="bg-gradient-to-r from-[#EAB308] to-[#D4AF37] p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Afterglow Heritage Notification</h2>
          </div>
          <p className="text-sm opacity-90">Secure Digital Inheritance Access</p>
        </div>

        {/* Email Body */}
        <div className="p-8 space-y-6 text-gray-800">
          <div>
            <p className="text-lg font-semibold mb-2">Dear {beneficiaryName},</p>
            <p className="text-gray-700 leading-relaxed">
              You have been designated as a beneficiary for a Digital Heirloom vault. The inheritance process has been activated, and you now have access to recover the encrypted digital assets.
            </p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-[#EAB308] p-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Your Secure Release Token:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border border-gray-300 rounded px-4 py-2 font-mono text-sm font-bold text-[#EAB308]">
                {releaseToken}
              </code>
              <button
                onClick={handleCopy}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                title="Copy token"
              >
                {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-gray-700">
              <strong>Important Instructions:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 ml-4">
              <li>Use this token to access the Beneficiary Unlock Portal</li>
              <li>You will need the Recovery Kit (24-word mnemonic) or Master Password to decrypt assets</li>
              <li>This token is valid for 24 hours</li>
              <li>Keep this token secure and confidential</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Zero-Knowledge Security:</strong> Afterglow does not store your Master Password or any unencrypted data. All decryption happens locally in your browser.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleUseToken}
              className="flex-1 px-6 py-3 bg-[#EAB308] hover:bg-[#D4AF37] text-black font-bold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span>Access Unlock Portal</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-all"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Email Footer */}
        <div className="bg-gray-100 p-4 border-t text-center">
          <p className="text-xs text-gray-600">
            This is a simulated email notification for testing purposes.
            <br />
            Afterglow Digital Heirloom - Secure Digital Inheritance Platform
          </p>
        </div>
      </div>
    </div>
  );
}
