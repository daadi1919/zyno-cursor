import { QueryCache } from './cache';
import { QueryContext } from '@zyno/types';

describe('QueryCache', () => {
  let cache: QueryCache;
  const mockContext: QueryContext = {
    userId: 'test-user',
    sessionId: 'test-session',
    previousQueries: [],
  };

  beforeEach(() => {
    cache = new QueryCache(2); // Taille maximale de 2 pour les tests
  });

  describe('get et set', () => {
    it('devrait stocker et récupérer une entrée', async () => {
      const query = 'test query';
      const result = {
        optimizedQuery: 'optimized test query',
        confidence: 0.95,
        tokensUsed: 100,
        appliedStrategies: ['strategy1'],
      };

      await cache.set(query, mockContext, result);
      const cachedResult = await cache.get(query, mockContext);

      expect(cachedResult).toEqual(result);
    });

    it('devrait retourner null pour une requête non mise en cache', async () => {
      const result = await cache.get('non-existent', mockContext);
      expect(result).toBeNull();
    });

    it('devrait gérer les entrées expirées', async () => {
      const query = 'test query';
      const result = {
        optimizedQuery: 'optimized test query',
        confidence: 0.95,
        tokensUsed: 100,
        appliedStrategies: ['strategy1'],
      };

      // Créer un cache avec un TTL très court
      const shortTTLCache = new QueryCache(2, 100); // 100ms TTL
      await shortTTLCache.set(query, mockContext, result);

      // Attendre que l'entrée expire
      await new Promise(resolve => setTimeout(resolve, 200));

      const cachedResult = await shortTTLCache.get(query, mockContext);
      expect(cachedResult).toBeNull();
    });
  });

  describe('éviction', () => {
    it('devrait évincer l\'entrée la moins précieuse quand le cache est plein', async () => {
      const result1 = {
        optimizedQuery: 'optimized query 1',
        confidence: 0.95,
        tokensUsed: 100,
        appliedStrategies: ['strategy1'],
      };

      const result2 = {
        optimizedQuery: 'optimized query 2',
        confidence: 0.95,
        tokensUsed: 100,
        appliedStrategies: ['strategy2'],
      };

      const result3 = {
        optimizedQuery: 'optimized query 3',
        confidence: 0.95,
        tokensUsed: 100,
        appliedStrategies: ['strategy3'],
      };

      // Remplir le cache
      await cache.set('query1', mockContext, result1);
      await cache.set('query2', mockContext, result2);

      // Accéder à query1 plusieurs fois pour augmenter sa valeur
      await cache.get('query1', mockContext);
      await cache.get('query1', mockContext);

      // Ajouter une nouvelle entrée
      await cache.set('query3', mockContext, result3);

      // Vérifier que query2 a été évincé
      const cachedResult1 = await cache.get('query1', mockContext);
      const cachedResult2 = await cache.get('query2', mockContext);
      const cachedResult3 = await cache.get('query3', mockContext);

      expect(cachedResult1).toEqual(result1);
      expect(cachedResult2).toBeNull();
      expect(cachedResult3).toEqual(result3);
    });
  });

  describe('nettoyage', () => {
    it('devrait nettoyer les entrées expirées', async () => {
      const shortTTLCache = new QueryCache(2, 100); // 100ms TTL

      const result1 = {
        optimizedQuery: 'optimized query 1',
        confidence: 0.95,
        tokensUsed: 100,
        appliedStrategies: ['strategy1'],
      };

      const result2 = {
        optimizedQuery: 'optimized query 2',
        confidence: 0.95,
        tokensUsed: 100,
        appliedStrategies: ['strategy2'],
      };

      await shortTTLCache.set('query1', mockContext, result1);
      await shortTTLCache.set('query2', mockContext, result2);

      // Attendre que les entrées expirent
      await new Promise(resolve => setTimeout(resolve, 200));

      await shortTTLCache.cleanup();

      const stats = await shortTTLCache.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('statistiques', () => {
    it('devrait fournir des statistiques correctes', async () => {
      const result = {
        optimizedQuery: 'optimized test query',
        confidence: 0.95,
        tokensUsed: 100,
        appliedStrategies: ['strategy1'],
      };

      await cache.set('query1', mockContext, result);
      await cache.get('query1', mockContext);
      await cache.get('query1', mockContext);

      const stats = await cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.hitCount).toBe(2);
      expect(stats.missCount).toBe(0);
      expect(stats.averageHitCount).toBe(2);
    });
  });

  describe('génération de clé', () => {
    it('devrait générer des clés uniques pour différentes requêtes', async () => {
      const result1 = {
        optimizedQuery: 'optimized query 1',
        confidence: 0.95,
        tokensUsed: 100,
        appliedStrategies: ['strategy1'],
      };

      const result2 = {
        optimizedQuery: 'optimized query 2',
        confidence: 0.95,
        tokensUsed: 100,
        appliedStrategies: ['strategy2'],
      };

      const context1: QueryContext = {
        userId: 'user1',
        sessionId: 'session1',
        previousQueries: [],
      };

      const context2: QueryContext = {
        userId: 'user2',
        sessionId: 'session2',
        previousQueries: [],
      };

      await cache.set('query1', context1, result1);
      await cache.set('query1', context2, result2);

      const cachedResult1 = await cache.get('query1', context1);
      const cachedResult2 = await cache.get('query1', context2);

      expect(cachedResult1).toEqual(result1);
      expect(cachedResult2).toEqual(result2);
    });
  });
}); 