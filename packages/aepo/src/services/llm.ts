import { z } from 'zod';
import { QueryContext } from '@zyno/types';
import { OptimizationStrategyManager } from './optimization-strategies';
import { QueryCache } from './cache';
import { MetricsService } from './metrics';
import { ErrorHandlingService } from './error-handling';

const LLMResponse = z.object({
  optimizedQuery: z.string(),
  confidence: z.number(),
  tokensUsed: z.number(),
  explanation: z.string().optional(),
  appliedStrategies: z.array(z.string()),
  fromCache: z.boolean().optional(),
});

export class LLMService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private strategyManager: OptimizationStrategyManager;
  private cache: QueryCache;
  private metrics: MetricsService;
  private errorHandling: ErrorHandlingService;

  constructor(
    apiKey: string,
    model: string = 'gpt-4',
    baseUrl: string = 'https://api.openai.com/v1',
    cacheSize: number = 1000,
    cacheTTL: number = 24 * 60 * 60 * 1000,
    errorHandling: ErrorHandlingService
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
    this.strategyManager = new OptimizationStrategyManager();
    this.cache = new QueryCache(cacheSize, cacheTTL);
    this.metrics = new MetricsService();
    this.errorHandling = errorHandling;
  }

  async optimizeQuery(
    query: string,
    context: QueryContext
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    this.metrics.startQuery();

    try {
      // Vérifier le cache
      const cachedResult = await this.errorHandling.withRetry(
        () => this.cache.get(query, context),
        'cache-get'
      );

      if (cachedResult) {
        this.metrics.endQuery({
          success: true,
          responseTime: Date.now() - startTime,
          fromCache: true,
        });
        return {
          ...cachedResult,
          fromCache: true,
        };
      }

      // Appliquer les stratégies d'optimisation
      const optimizedQuery = await this.errorHandling.withRetry(
        () => this.strategyManager.applyStrategies(query, context),
        'optimization-strategies'
      );

      if (optimizedQuery.appliedStrategies.length > 0) {
        const result = await this.errorHandling.withTimeout(
          () => this.optimizeWithLLM(optimizedQuery.query, context),
          10000
        );

        // Mettre en cache le résultat
        await this.errorHandling.withRetry(
          () => this.cache.set(query, context, result),
          'cache-set'
        );

        this.metrics.endQuery({
          success: true,
          responseTime: Date.now() - startTime,
          fromCache: false,
        });

        return result;
      }

      // Si aucune stratégie n'a été appliquée, utiliser le LLM directement
      const result = await this.errorHandling.withTimeout(
        () => this.optimizeWithLLM(query, context),
        10000
      );

      this.metrics.endQuery({
        success: true,
        responseTime: Date.now() - startTime,
        fromCache: false,
      });

      return result;
    } catch (error) {
      this.metrics.endQuery({
        success: false,
        responseTime: Date.now() - startTime,
        fromCache: false,
      });

      // Utiliser le fallback en cas d'erreur
      return this.errorHandling.withFallback(
        () => Promise.reject(error),
        () => this.getFallbackResponse(query, context)
      );
    }
  }

  private async getFallbackResponse(
    query: string,
    context: QueryContext
  ): Promise<LLMResponse> {
    return {
      optimizedQuery: query,
      confidence: 0.5,
      explanation: 'Réponse de secours en raison d\'une erreur',
      appliedStrategies: [],
      fromCache: false,
    };
  }

  private async optimizeWithLLM(query: string, context: QueryContext): Promise<z.infer<typeof LLMResponse>> {
    const prompt = this.buildPrompt(query, context, []);
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Vous êtes un expert en optimisation de requêtes. Votre tâche est d\'améliorer la formulation des questions pour obtenir des réponses plus précises et pertinentes.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur LLM: ${response.statusText}`);
    }

    const data = await response.json();
    const optimizedQuery = data.choices[0].message.content;

    return {
      optimizedQuery,
      confidence: this.calculateConfidence(data, []),
      tokensUsed: data.usage.total_tokens,
      explanation: this.generateExplanation(query, optimizedQuery, []),
      appliedStrategies: [],
      fromCache: false,
    };
  }

  private buildPrompt(query: string, context: QueryContext, appliedStrategies: string[]): string {
    return `
      Requête originale: "${query}"
      ${appliedStrategies.length > 0 ? `Requête pré-optimisée: "${query}"` : ''}
      
      Contexte:
      - Utilisateur: ${context.userId}
      - Session: ${context.sessionId}
      - Requêtes précédentes: ${context.previousQueries.join(', ')}
      ${appliedStrategies.length > 0 ? `- Stratégies appliquées: ${appliedStrategies.join(', ')}` : ''}
      
      Optimisez cette requête pour obtenir une réponse plus précise et pertinente.
      Considérez le contexte de la conversation et les préférences de l'utilisateur.
    `;
  }

  private calculateConfidence(data: any, appliedStrategies: string[]): number {
    // Augmenter la confiance si des stratégies ont été appliquées
    const baseConfidence = 0.95;
    const strategyBonus = appliedStrategies.length * 0.05;
    return Math.min(baseConfidence + strategyBonus, 1.0);
  }

  private generateExplanation(
    originalQuery: string,
    optimizedQuery: string,
    appliedStrategies: string[]
  ): string {
    const strategyExplanation = appliedStrategies.length > 0
      ? ` Les stratégies suivantes ont été appliquées : ${appliedStrategies.join(', ')}.`
      : '';
    
    return `La requête a été optimisée de "${originalQuery}" à "${optimizedQuery}" pour améliorer la précision et la pertinence de la réponse.${strategyExplanation}`;
  }

  async getCacheStats(): Promise<{
    size: number;
    hitCount: number;
    missCount: number;
    averageHitCount: number;
  }> {
    return this.cache.getStats();
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  async cleanupCache(): Promise<void> {
    await this.cache.cleanup();
  }

  getMetrics() {
    return this.metrics.getMetrics();
  }

  resetMetrics() {
    this.metrics.resetMetrics();
  }

  getActiveQueries() {
    return this.metrics.getActiveQueries();
  }
} 