import { AEPOEngine } from './index';

describe('AEPOEngine', () => {
  let engine: AEPOEngine;

  beforeEach(() => {
    engine = new AEPOEngine(
      'bolt://localhost:7687',
      'neo4j',
      'password',
      'fake-api-key',
      'gpt-4'
    );
  });

  describe('optimizeQuery', () => {
    it('devrait utiliser une optimisation existante si disponible', async () => {
      const query = 'Comment fonctionne React?';
      const context = {
        userId: 'user-123',
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
        previousQueries: [],
        userPreferences: {},
      };

      // Simuler une optimisation existante
      const mockSimilarOptimizations = [{
        optimizedQuery: 'Comment React fonctionne-t-il?',
        confidence: 0.95,
        tokensUsed: 50,
      }];

      jest.spyOn(engine['neo4jService'], 'getSimilarOptimizations')
        .mockResolvedValueOnce(mockSimilarOptimizations);

      const result = await engine.optimizeQuery(query, context);

      expect(result.optimizedQuery).toBe('Comment React fonctionne-t-il?');
      expect(result.confidence).toBe(0.95);
      expect(result.tokensUsed).toBe(50);
    });

    it('devrait créer une nouvelle optimisation si aucune correspondance n\'est trouvée', async () => {
      const query = 'Comment fonctionne React?';
      const context = {
        userId: 'user-123',
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
        previousQueries: [],
        userPreferences: {},
      };

      // Simuler aucune optimisation existante
      jest.spyOn(engine['neo4jService'], 'getSimilarOptimizations')
        .mockResolvedValueOnce([]);

      // Simuler l'optimisation LLM
      const mockLLMResult = {
        optimizedQuery: 'Comment React fonctionne-t-il?',
        confidence: 0.95,
        tokensUsed: 50,
      };

      jest.spyOn(engine['llmService'], 'optimizeQuery')
        .mockResolvedValueOnce(mockLLMResult);

      const result = await engine.optimizeQuery(query, context);

      expect(result.optimizedQuery).toBe('Comment React fonctionne-t-il?');
      expect(result.confidence).toBe(0.95);
      expect(result.tokensUsed).toBe(50);
    });
  });

  describe('getOptimizationHistory', () => {
    it('devrait récupérer l\'historique des optimisations', async () => {
      const userId = 'user-123';
      const mockHistory = [
        {
          originalQuery: 'Comment fonctionne React?',
          optimizedQuery: 'Comment React fonctionne-t-il?',
          confidence: 0.95,
          optimizationTime: 100,
          tokensUsed: 50,
        },
      ];

      jest.spyOn(engine['neo4jService'], 'getOptimizationHistory')
        .mockResolvedValueOnce(mockHistory);

      const history = await engine.getOptimizationHistory(userId);

      expect(history).toEqual(mockHistory);
    });
  });

  describe('validateOptimization', () => {
    it('devrait valider un résultat correct', async () => {
      const validResult = {
        optimizedQuery: 'Comment React fonctionne-t-il?',
        confidence: 0.95,
        optimizationTime: 100,
        tokensUsed: 50,
      };

      const isValid = await engine.validateOptimization(validResult);
      expect(isValid).toBe(true);
    });

    it('devrait rejeter un résultat invalide', async () => {
      const invalidResult = {
        optimizedQuery: 'Comment React fonctionne-t-il?',
        confidence: '0.95', // Devrait être un nombre
        optimizationTime: 100,
        tokensUsed: 50,
      };

      const isValid = await engine.validateOptimization(invalidResult);
      expect(isValid).toBe(false);
    });
  });
}); 