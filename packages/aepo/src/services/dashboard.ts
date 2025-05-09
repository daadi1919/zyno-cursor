import { MetricsService } from './metrics';
import { QueryCache } from './cache';
import { MonitoringService, Alert } from './monitoring';

interface TimeSeriesData {
  timestamp: number;
  value: number;
}

interface DashboardMetrics {
  responseTime: TimeSeriesData[];
  errorRate: TimeSeriesData[];
  cacheHitRate: TimeSeriesData[];
  tokenUsage: TimeSeriesData[];
  activeQueries: number;
  totalQueries: number;
  recentAlerts: Alert[];
}

export class DashboardService {
  private metrics: MetricsService;
  private cache: QueryCache;
  private monitoring: MonitoringService;
  private timeSeriesData: {
    responseTime: TimeSeriesData[];
    errorRate: TimeSeriesData[];
    cacheHitRate: TimeSeriesData[];
    tokenUsage: TimeSeriesData[];
  };
  private readonly maxDataPoints: number;

  constructor(
    metrics: MetricsService,
    cache: QueryCache,
    monitoring: MonitoringService,
    maxDataPoints: number = 100
  ) {
    this.metrics = metrics;
    this.cache = cache;
    this.monitoring = monitoring;
    this.maxDataPoints = maxDataPoints;
    this.timeSeriesData = {
      responseTime: [],
      errorRate: [],
      cacheHitRate: [],
      tokenUsage: [],
    };
  }

  async updateMetrics(): Promise<void> {
    const metrics = this.metrics.getMetrics();
    const cacheStats = await this.cache.getStats();
    const timestamp = Date.now();

    // Mettre à jour les séries temporelles
    this.addDataPoint('responseTime', timestamp, metrics.averageResponseTime);
    this.addDataPoint('errorRate', timestamp, metrics.errorRate);
    this.addDataPoint('cacheHitRate', timestamp, cacheStats.hitRate);
    this.addDataPoint('tokenUsage', timestamp, metrics.tokenUsage.average);
  }

  private addDataPoint(
    metric: keyof typeof this.timeSeriesData,
    timestamp: number,
    value: number
  ): void {
    this.timeSeriesData[metric].push({ timestamp, value });
    if (this.timeSeriesData[metric].length > this.maxDataPoints) {
      this.timeSeriesData[metric].shift();
    }
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const metrics = this.metrics.getMetrics();
    const cacheStats = await this.cache.getStats();
    const recentAlerts = this.monitoring.getAlerts({
      startTime: Date.now() - 24 * 60 * 60 * 1000, // Dernières 24 heures
    });

    return {
      responseTime: this.timeSeriesData.responseTime,
      errorRate: this.timeSeriesData.errorRate,
      cacheHitRate: this.timeSeriesData.cacheHitRate,
      tokenUsage: this.timeSeriesData.tokenUsage,
      activeQueries: this.metrics.getActiveQueries(),
      totalQueries: metrics.queryCount,
      recentAlerts: recentAlerts.slice(0, 10), // 10 dernières alertes
    };
  }

  getTimeRangeData(
    metric: keyof typeof this.timeSeriesData,
    startTime: number,
    endTime: number
  ): TimeSeriesData[] {
    return this.timeSeriesData[metric].filter(
      data => data.timestamp >= startTime && data.timestamp <= endTime
    );
  }

  clearTimeSeriesData(): void {
    this.timeSeriesData = {
      responseTime: [],
      errorRate: [],
      cacheHitRate: [],
      tokenUsage: [],
    };
  }
} 