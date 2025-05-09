import { MetricsService } from './metrics';

describe('MetricsService', () => {
  let metricsService: MetricsService;

  beforeEach(() => {
    metricsService = new MetricsService();
  });

  describe('startQuery', () => {
    it('devrait démarrer une nouvelle requête', () => {
      const queryId = 'test-query-1';
      metricsService.startQuery(queryId);
      expect(metricsService.getActiveQueries()).toBe(1);
    });
  });

  describe('endQuery', () => {
    it('devrait mettre à jour les métriques correctement', () => {
      const queryId = 'test-query-1';
      const strategies = ['strategy1', 'strategy2'];
      const tokensUsed = 100;

      metricsService.startQuery(queryId);
      metricsService.endQuery(queryId, strategies, tokensUsed);

      const metrics = metricsService.getMetrics();
      expect(metrics.queryCount).toBe(1);
      expect(metrics.strategyUsage).toEqual({
        strategy1: 1,
        strategy2: 1,
      });
      expect(metrics.tokenUsage.total).toBe(tokensUsed);
      expect(metrics.tokenUsage.average).toBe(tokensUsed);
    });

    it('devrait gérer les requêtes en cache', () => {
      const queryId = 'test-query-1';
      const strategies = ['strategy1'];

      metricsService.startQuery(queryId);
      metricsService.endQuery(queryId, strategies, undefined, undefined, true);

      const metrics = metricsService.getMetrics();
      expect(metrics.cacheStats.hits).toBe(1);
      expect(metrics.cacheStats.misses).toBe(0);
      expect(metrics.cacheStats.hitRate).toBe(1);
    });

    it('devrait gérer les erreurs', () => {
      const queryId = 'test-query-1';
      const error = new Error('Test error');

      metricsService.startQuery(queryId);
      metricsService.endQuery(queryId, [], undefined, error);

      const metrics = metricsService.getMetrics();
      expect(metrics.errorRate).toBe(1);
    });
  });

  describe('resetMetrics', () => {
    it('devrait réinitialiser toutes les métriques', () => {
      const queryId = 'test-query-1';
      metricsService.startQuery(queryId);
      metricsService.endQuery(queryId, ['strategy1'], 100);

      metricsService.resetMetrics();

      const metrics = metricsService.getMetrics();
      expect(metrics.queryCount).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
      expect(metrics.strategyUsage).toEqual({});
      expect(metrics.cacheStats.hits).toBe(0);
      expect(metrics.cacheStats.misses).toBe(0);
      expect(metrics.cacheStats.hitRate).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.tokenUsage.total).toBe(0);
      expect(metrics.tokenUsage.average).toBe(0);
    });
  });

  describe('getActiveQueries', () => {
    it('devrait retourner le nombre de requêtes actives', () => {
      expect(metricsService.getActiveQueries()).toBe(0);

      metricsService.startQuery('query1');
      expect(metricsService.getActiveQueries()).toBe(1);

      metricsService.startQuery('query2');
      expect(metricsService.getActiveQueries()).toBe(2);

      metricsService.endQuery('query1', []);
      expect(metricsService.getActiveQueries()).toBe(1);
    });
  });
}); 