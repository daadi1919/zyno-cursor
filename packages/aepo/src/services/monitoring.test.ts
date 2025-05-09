import { MonitoringService } from './monitoring';
import { MetricsService } from './metrics';
import { QueryCache } from './cache';

describe('MonitoringService', () => {
  let monitoring: MonitoringService;
  let metrics: MetricsService;
  let cache: QueryCache;

  beforeEach(() => {
    metrics = new MetricsService();
    cache = new QueryCache();
    monitoring = new MonitoringService(metrics, cache, {
      checkInterval: 100, // Intervalle court pour les tests
    });
  });

  afterEach(() => {
    monitoring.stop();
  });

  describe('démarrage et arrêt', () => {
    it('devrait démarrer et arrêter le monitoring', () => {
      expect(monitoring['checkInterval']).toBeNull();
      
      monitoring.start();
      expect(monitoring['checkInterval']).not.toBeNull();
      
      monitoring.stop();
      expect(monitoring['checkInterval']).toBeNull();
    });
  });

  describe('alertes', () => {
    it('devrait générer une alerte pour un taux d\'erreur élevé', async () => {
      const queryId = 'test-query';
      metrics.startQuery(queryId);
      metrics.endQuery(queryId, [], undefined, new Error('Test error'));

      monitoring.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      const alerts = monitoring.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('error');
      expect(alerts[0].message).toContain('Taux d\'erreur élevé');
    });

    it('devrait générer une alerte pour un temps de réponse élevé', async () => {
      const queryId = 'test-query';
      metrics.startQuery(queryId);
      // Simuler un temps de réponse élevé
      await new Promise(resolve => setTimeout(resolve, 100));
      metrics.endQuery(queryId, []);

      monitoring.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      const alerts = monitoring.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('warning');
      expect(alerts[0].message).toContain('Temps de réponse élevé');
    });

    it('devrait générer une alerte pour un taux de hits du cache faible', async () => {
      // Configurer un seuil élevé pour forcer l'alerte
      monitoring.updateConfig({ cacheHitRateThreshold: 0.9 });

      monitoring.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      const alerts = monitoring.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('warning');
      expect(alerts[0].message).toContain('Taux de hits du cache faible');
    });
  });

  describe('filtrage des alertes', () => {
    it('devrait filtrer les alertes par type', async () => {
      const queryId = 'test-query';
      metrics.startQuery(queryId);
      metrics.endQuery(queryId, [], undefined, new Error('Test error'));

      monitoring.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      const errorAlerts = monitoring.getAlerts({ type: 'error' });
      const warningAlerts = monitoring.getAlerts({ type: 'warning' });

      expect(errorAlerts.length).toBeGreaterThan(0);
      expect(warningAlerts.length).toBe(0);
    });

    it('devrait filtrer les alertes par période', async () => {
      const queryId = 'test-query';
      metrics.startQuery(queryId);
      metrics.endQuery(queryId, [], undefined, new Error('Test error'));

      monitoring.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      const now = Date.now();
      const pastAlerts = monitoring.getAlerts({
        startTime: now - 1000,
        endTime: now,
      });

      expect(pastAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('configuration', () => {
    it('devrait mettre à jour la configuration', () => {
      const newConfig = {
        errorRateThreshold: 0.2,
        responseTimeThreshold: 10000,
      };

      monitoring.updateConfig(newConfig);

      expect(monitoring['config'].errorRateThreshold).toBe(0.2);
      expect(monitoring['config'].responseTimeThreshold).toBe(10000);
    });

    it('devrait redémarrer le monitoring si l\'intervalle change', () => {
      monitoring.start();
      const oldInterval = monitoring['checkInterval'];

      monitoring.updateConfig({ checkInterval: 200 });
      const newInterval = monitoring['checkInterval'];

      expect(oldInterval).not.toBe(newInterval);
    });
  });

  describe('nettoyage', () => {
    it('devrait effacer les alertes', async () => {
      const queryId = 'test-query';
      metrics.startQuery(queryId);
      metrics.endQuery(queryId, [], undefined, new Error('Test error'));

      monitoring.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(monitoring.getAlerts().length).toBeGreaterThan(0);
      
      monitoring.clearAlerts();
      expect(monitoring.getAlerts().length).toBe(0);
    });
  });
}); 