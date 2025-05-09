import { QueryContext } from '@zyno/types';

interface PerformanceMetrics {
  queryCount: number;
  averageResponseTime: number;
  strategyUsage: Record<string, number>;
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  errorRate: number;
  tokenUsage: {
    total: number;
    average: number;
  };
}

interface QueryMetrics {
  startTime: number;
  endTime?: number;
  strategies: string[];
  tokensUsed?: number;
  error?: Error;
  fromCache?: boolean;
}

export class MetricsService {
  private metrics: PerformanceMetrics;
  private activeQueries: Map<string, QueryMetrics>;

  constructor() {
    this.metrics = {
      queryCount: 0,
      averageResponseTime: 0,
      strategyUsage: {},
      cacheStats: {
        hits: 0,
        misses: 0,
        hitRate: 0,
      },
      errorRate: 0,
      tokenUsage: {
        total: 0,
        average: 0,
      },
    };
    this.activeQueries = new Map();
  }

  startQuery(queryId: string): void {
    this.activeQueries.set(queryId, {
      startTime: Date.now(),
      strategies: [],
    });
  }

  endQuery(
    queryId: string,
    strategies: string[],
    tokensUsed?: number,
    error?: Error,
    fromCache?: boolean
  ): void {
    const queryMetrics = this.activeQueries.get(queryId);
    if (!queryMetrics) return;

    queryMetrics.endTime = Date.now();
    queryMetrics.strategies = strategies;
    queryMetrics.tokensUsed = tokensUsed;
    queryMetrics.error = error;
    queryMetrics.fromCache = fromCache;

    this.updateMetrics(queryMetrics);
    this.activeQueries.delete(queryId);
  }

  private updateMetrics(queryMetrics: QueryMetrics): void {
    const { startTime, endTime, strategies, tokensUsed, error, fromCache } = queryMetrics;
    if (!endTime) return;

    // Mise à jour du nombre de requêtes
    this.metrics.queryCount++;

    // Mise à jour du temps de réponse moyen
    const responseTime = endTime - startTime;
    this.metrics.averageResponseTime = (
      (this.metrics.averageResponseTime * (this.metrics.queryCount - 1) + responseTime) /
      this.metrics.queryCount
    );

    // Mise à jour de l'utilisation des stratégies
    strategies.forEach((strategy) => {
      this.metrics.strategyUsage[strategy] = (this.metrics.strategyUsage[strategy] || 0) + 1;
    });

    // Mise à jour des statistiques du cache
    if (fromCache) {
      this.metrics.cacheStats.hits++;
    } else {
      this.metrics.cacheStats.misses++;
    }
    this.metrics.cacheStats.hitRate =
      this.metrics.cacheStats.hits / (this.metrics.cacheStats.hits + this.metrics.cacheStats.misses);

    // Mise à jour du taux d'erreur
    if (error) {
      this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.queryCount - 1) + 1) / this.metrics.queryCount;
    }

    // Mise à jour de l'utilisation des tokens
    if (tokensUsed) {
      this.metrics.tokenUsage.total += tokensUsed;
      this.metrics.tokenUsage.average = this.metrics.tokenUsage.total / this.metrics.queryCount;
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      queryCount: 0,
      averageResponseTime: 0,
      strategyUsage: {},
      cacheStats: {
        hits: 0,
        misses: 0,
        hitRate: 0,
      },
      errorRate: 0,
      tokenUsage: {
        total: 0,
        average: 0,
      },
    };
    this.activeQueries.clear();
  }

  getActiveQueries(): number {
    return this.activeQueries.size;
  }
} 