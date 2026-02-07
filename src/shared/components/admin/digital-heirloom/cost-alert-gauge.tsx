/**
 * Cost Alert Gauge Component
 * 成本预警仪表盘组件
 * 
 * 功能：根据资源使用率动态显示颜色，帮助管理员瞬间识别压力点
 */

'use client';

import React from 'react';

interface CostAlertGaugeProps {
  label: string;
  current: number;
  total: number;
  unit?: string;
  showWarning?: boolean;
}

export function CostAlertGauge({ 
  label, 
  current, 
  total, 
  unit = '',
  showWarning = true 
}: CostAlertGaugeProps) {
  const percentage = Math.min(Math.round((current / total) * 100), 100);
  
  // 动态颜色逻辑：超过 90% 红色，超过 70% 橙色，否则蓝色
  const getColorClasses = (pct: number) => {
    if (pct >= 90) {
      return {
        bg: 'bg-red-500',
        text: 'text-red-500',
        badge: 'bg-red-100 text-red-700 border-red-200',
      };
    }
    if (pct >= 70) {
      return {
        bg: 'bg-orange-500',
        text: 'text-orange-500',
        badge: 'bg-orange-100 text-orange-700 border-orange-200',
      };
    }
    return {
      bg: 'bg-blue-500',
      text: 'text-blue-500',
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
    };
  };

  const colors = getColorClasses(percentage);

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}>
          {percentage}%
        </span>
      </div>
      
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-bold text-gray-800">{current.toLocaleString()}</span>
        <span className="text-gray-400 text-xs">/ {total.toLocaleString()} {unit}</span>
      </div>

      {/* 进度条轨道 */}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out ${colors.bg}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showWarning && percentage >= 90 && (
        <p className="mt-2 text-[10px] text-red-500 flex items-center gap-1">
          ⚠️ 资源接近枯竭，建议启动成本熔断
        </p>
      )}
    </div>
  );
}
