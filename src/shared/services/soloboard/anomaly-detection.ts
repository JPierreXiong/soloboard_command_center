/**
 * Anomaly Detection Service
 * 检测网站异常（无单警报、流量异常等）
 */

interface SiteMetrics {
  todayRevenue: number;
  todayVisitors: number;
  avgRevenue7d: number;
  avgVisitors7d: number;
}

interface Anomaly {
  type: 'no_sales' | 'low_traffic' | 'offline';
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

/**
 * Detect anomalies for a site
 */
export function detectAnomalies(
  metrics: SiteMetrics,
  currentHour: number = new Date().getHours()
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // No Sales Alert (Pro feature)
  // Trigger: Usually has sales, but $0 today after 4pm
  if (
    metrics.avgRevenue7d > 0 &&
    metrics.todayRevenue === 0 &&
    currentHour >= 16
  ) {
    anomalies.push({
      type: 'no_sales',
      severity: 'warning',
      message: 'No sales today (usually has sales)',
    });
  }

  // Low Traffic Alert (Base/Pro feature)
  // Trigger: Traffic is 30% below 7-day average
  if (
    metrics.avgVisitors7d > 0 &&
    metrics.todayVisitors < metrics.avgVisitors7d * 0.7
  ) {
    anomalies.push({
      type: 'low_traffic',
      severity: 'warning',
      message: "Traffic is 30% below average",
    });
  }

  return anomalies;
}

/**
 * Determine site status based on metrics and anomalies
 */
export function determineSiteStatus(
  isOnline: boolean,
  anomalies: Anomaly[]
): 'online' | 'offline' | 'warning' {
  if (!isOnline) {
    return 'offline';
  }

  if (anomalies.length > 0) {
    return 'warning';
  }

  return 'online';
}

/**
 * Calculate 7-day average
 */
export function calculate7DayAverage(history: number[]): number {
  if (history.length === 0) return 0;
  const sum = history.reduce((acc, val) => acc + val, 0);
  return sum / history.length;
}

