/**
 * Digital Heirloom Check-in 页面
 * 打卡页面
 */

'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CheckInHistory {
  date: string;
  status: 'success' | 'missed';
}

export default function DigitalHeirloomCheckInPage() {
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
  const [nextCheckInDue, setNextCheckInDue] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<CheckInHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    loadCheckInData();
  }, []);

  const loadCheckInData = async () => {
    try {
      // 1. 获取保险箱信息
      const vaultResponse = await fetch('/api/digital-heirloom/vault/get');
      const vaultResult = await vaultResponse.json();

      if (vaultResult.code !== 200 || !vaultResult.data?.vault) {
        setLastCheckIn(null);
        setNextCheckInDue(null);
        setStreak(0);
        setHistory([]);
        return;
      }

      const vault = vaultResult.data.vault;
      const latestHeartbeat = vaultResult.data.latestHeartbeat;
      const recentEvents = vaultResult.data.recentEvents || [];

      // 2. 设置最后打卡时间
      if (latestHeartbeat?.createdAt) {
        setLastCheckIn(latestHeartbeat.createdAt);
      } else {
        setLastCheckIn(null);
      }

      // 3. 计算下次到期时间
      if (vault.lastSeenAt && vault.heartbeatFrequency) {
        const lastSeen = new Date(vault.lastSeenAt);
        const nextDue = new Date(lastSeen.getTime() + vault.heartbeatFrequency * 24 * 60 * 60 * 1000);
        const now = new Date();
        const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        setNextCheckInDue(daysUntilDue > 0 ? daysUntilDue : 0);
      } else {
        setNextCheckInDue(null);
      }

      // 4. 计算打卡连续周数（简化版）
      // TODO: 从历史记录计算准确的连续周数
      setStreak(0);

      // 5. 构建打卡历史（从事件记录）
      const heartbeatEvents = recentEvents
        .filter((e: any) => e.eventType === 'heartbeat_received')
        .map((e: any) => ({
          date: e.createdAt,
          status: 'success' as const,
        }))
        .slice(0, 10); // 最近 10 条

      setHistory(heartbeatEvents);
    } catch (error) {
      console.error('加载打卡数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const response = await fetch('/api/digital-heirloom/vault/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(result.message || '打卡失败');
      }

      toast.success('打卡成功！您的数字遗产将继续受到保护。');
      await loadCheckInData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '打卡失败，请稍后重试');
    } finally {
      setCheckingIn(false);
    }
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Check-in</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Confirm you're still active to keep your digital legacy protected
          </p>
        </div>

        {/* 打卡卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 mb-8">
          <div className="text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-4">
                <Clock className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                I'm Still Here
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Click the button below to confirm you're active
              </p>
            </div>

            {nextCheckInDue !== null && nextCheckInDue > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center justify-center space-x-2 text-yellow-800 dark:text-yellow-400">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">
                    Next check-in due in {nextCheckInDue} days
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors text-lg"
            >
              {checkingIn ? 'Checking in...' : "I'm Still Here"}
            </button>

            {lastCheckIn && (
              <p className="mt-4 text-sm text-gray-500">
                Last check-in: {new Date(lastCheckIn).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Check-in Streak
              </h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {streak} weeks
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Last Check-in
              </h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {lastCheckIn ? new Date(lastCheckIn).toLocaleDateString() : 'Never'}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-2">
              <Clock className="w-6 h-6 text-yellow-600" />
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Next Due
              </h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {nextCheckInDue !== null ? `${nextCheckInDue} days` : 'N/A'}
            </p>
          </div>
        </div>

        {/* 打卡历史 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Check-in History
          </h2>
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No check-in history yet</p>
            ) : (
              history.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {item.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="text-gray-900 dark:text-white">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${
                    item.status === 'success'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {item.status === 'success' ? 'Success' : 'Missed'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

