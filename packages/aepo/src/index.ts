import { z } from 'zod';
import { QueryContext, QueryResult } from '@zyno/types';
import { LLMService } from './services/llm';
import { Neo4jService } from './services/neo4j';

export interface QueryContext {
  userId: string;
  sessionId: string;
  timestamp: Date;
  previousQueries: string[];
  userPreferences: Record<string, any>;
}

export interface OptimizedQuery {
  originalQuery: string;
  optimizedQuery: string;
  confidence: number;
  context: QueryContext;
  semanticMap: Record<string, string[]>;
}

const PromptOptimizationResult = z.object({
  optimizedQuery: z.string(),
  confidence: z.number(),
  optimizationTime: z.number(),
  tokensUsed: z.number(),
});

export class AEPOEngine {
  private llmService: LLMService;
  private neo4jService: Neo4jService;

  constructor(
    neo4jUri: string,
    neo4jUsername: string,
    neo4jPassword: string,
    llmApiKey: string,
    llmModel?: string
  ) {
    this.llmService = new LLMService(llmApiKey, llmModel);
    this.neo4jService = new Neo4jService(neo4jUri, neo4jUsername, neo4jPassword);
  }

  async optimizeQuery(query: string, context: QueryContext): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      // Vérifier les optimisations similaires
      const similarOptimizations = await this.neo4jService.getSimilarOptimizations(query);
      if (similarOptimizations.length > 0) {
        const bestMatch = similarOptimizations[0];
        if (bestMatch.confidence > 0.9) {
          return {
            optimizedQuery: bestMatch.optimizedQuery,
            confidence: bestMatch.confidence,
            optimizationTime: Date.now() - startTime,
            tokensUsed: bestMatch.tokensUsed,
          };
        }
      }

      // Optimiser avec LLM si pas de correspondance satisfaisante
      const result = await this.llmService.optimizeQuery(query, context);
      const endTime = Date.now();

      const optimizationResult = {
        optimizedQuery: result.optimizedQuery,
        confidence: result.confidence,
        optimizationTime: endTime - startTime,
        tokensUsed: result.tokensUsed,
      };

      // Sauvegarder l'optimisation
      await this.neo4jService.saveOptimization(
        query,
        result.optimizedQuery,
        optimizationResult,
        context
      );

      return optimizationResult;
    } catch (error) {
      console.error('Erreur lors de l\'optimisation:', error);
      throw error;
    }
  }

  async validateOptimization(result: unknown): Promise<boolean> {
    try {
      PromptOptimizationResult.parse(result);
      return true;
    } catch (error) {
      console.error('Erreur de validation du résultat:', error);
      return false;
    }
  }

  async getOptimizationHistory(userId: string, limit?: number): Promise<any[]> {
    return this.neo4jService.getOptimizationHistory(userId, limit);
  }

  async close(): Promise<void> {
    await this.neo4jService.close();
  }
}

export * from './types'; 