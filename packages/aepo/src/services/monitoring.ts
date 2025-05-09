import { MetricsService } from './metrics';
import { QueryCache } from './cache';
import { NotificationService } from './notifications';

export interface Alert {
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
  metric: string;
  value: number;
  threshold: number;
}

interface MonitoringConfig {
  errorRateThreshold: number;
  responseTimeThreshold: number;
  cacheHitRateThreshold: number;
  tokenUsageThreshold: number;
  checkInterval: number;
}

export class MonitoringService {
  private metrics: MetricsService;
  private cache: QueryCache;
  private config: MonitoringConfig;
  private alerts: Alert[];
  private checkInterval: NodeJS.Timeout | null;
  private notificationService: NotificationService;

  constructor(
    metrics: MetricsService,
    cache: QueryCache,
    notificationService: NotificationService,
    config: Partial<MonitoringConfig> = {}
  ) {
    this.metrics = metrics;
    this.cache = cache;
    this.notificationService = notificationService;
    this.config = {
      errorRateThreshold: 0.1, // 10% d'erreurs
      responseTimeThreshold: 5000, // 5 secondes
      cacheHitRateThreshold: 0.5, // 50% de hits
      tokenUsageThreshold: 1000, // 1000 tokens par requête
      checkInterval: 60000, // 1 minute
      ...config,
    };
    this.alerts = [];
    this.checkInterval = null;
  }

  start(): void {
    if (this.checkInterval) {
      return;
    }

    this.checkInterval = setInterval(() => {
      this.checkMetrics();
    }, this.config.checkInterval);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkMetrics(): Promise<void> {
    const metrics = this.metrics.getMetrics();
    const cacheStats = await this.cache.getStats();

    // Vérifier le taux d'erreur
    if (metrics.errorRate > this.config.errorRateThreshold) {
      this.addAlert('error', 'Taux d\'erreur élevé', metrics.errorRate, this.config.errorRateThreshold);
    }

    // Vérifier le temps de réponse
    if (metrics.averageResponseTime > this.config.responseTimeThreshold) {
      this.addAlert('warning', 'Temps de réponse élevé', metrics.averageResponseTime, this.config.responseTimeThreshold);
    }

    // Vérifier le taux de hits du cache
    if (cacheStats.hitRate < this.config.cacheHitRateThreshold) {
      this.addAlert('warning', 'Taux de hits du cache faible', cacheStats.hitRate, this.config.cacheHitRateThreshold);
    }

    // Vérifier l'utilisation des tokens
    if (metrics.tokenUsage.average > this.config.tokenUsageThreshold) {
      this.addAlert('warning', 'Utilisation élevée des tokens', metrics.tokenUsage.average, this.config.tokenUsageThreshold);
    }
  }

  private async addAlert(
    type: Alert['type'],
    message: string,
    value: number,
    threshold: number
  ): Promise<void> {
    const alert: Alert = {
      type,
      message,
      timestamp: Date.now(),
      metric: message.split(' ')[0].toLowerCase(),
      value,
      threshold,
    };

    this.alerts.push(alert);
    await this.notifyAlert(alert);
  }

  private async notifyAlert(alert: Alert): Promise<void> {
    try {
      await this.notificationService.notify(alert);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
    }
  }

  getAlerts(options: {
    type?: Alert['type'];
    startTime?: number;
    endTime?: number;
  } = {}): Alert[] {
    return this.alerts.filter(alert => {
      if (options.type && alert.type !== options.type) {
        return false;
      }
      if (options.startTime && alert.timestamp < options.startTime) {
        return false;
      }
      if (options.endTime && alert.timestamp > options.endTime) {
        return false;
      }
      return true;
    });
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };

    // Redémarrer le monitoring si l'intervalle a changé
    if (newConfig.checkInterval) {
      this.stop();
      this.start();
    }
  }
} 