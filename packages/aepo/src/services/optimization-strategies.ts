import { QueryContext } from '@zyno/types';

export interface OptimizationStrategy {
  name: string;
  priority: number;
  canApply: (query: string, context: QueryContext) => boolean;
  optimize: (query: string, context: QueryContext) => Promise<string>;
}

export class QueryClarificationStrategy implements OptimizationStrategy {
  name = 'clarification';
  priority = 1;

  canApply(query: string, context: QueryContext): boolean {
    // Appliquer si la requête est trop vague ou courte
    return query.length < 20 || !query.includes('?');
  }

  async optimize(query: string, context: QueryContext): Promise<string> {
    if (!query.includes('?')) {
      return `${query} ?`;
    }
    return query;
  }
}

export class ContextAwareStrategy implements OptimizationStrategy {
  name = 'context-aware';
  priority = 2;

  canApply(query: string, context: QueryContext): boolean {
    // Appliquer si nous avons des requêtes précédentes
    return context.previousQueries.length > 0;
  }

  async optimize(query: string, context: QueryContext): Promise<string> {
    const lastQuery = context.previousQueries[context.previousQueries.length - 1];
    
    // Ajouter le contexte de la dernière requête si pertinent
    if (this.isRelatedQuery(query, lastQuery)) {
      return `En suivant sur "${lastQuery}", ${query}`;
    }
    
    return query;
  }

  private isRelatedQuery(current: string, previous: string): boolean {
    // TODO: Implémenter une logique plus sophistiquée de détection de relation
    const currentWords = new Set(current.toLowerCase().split(/\s+/));
    const previousWords = new Set(previous.toLowerCase().split(/\s+/));
    const commonWords = [...currentWords].filter(word => previousWords.has(word));
    return commonWords.length >= 2;
  }
}

export class TechnicalPrecisionStrategy implements OptimizationStrategy {
  name = 'technical-precision';
  priority = 3;

  private technicalTerms = new Set([
    'api', 'rest', 'graphql', 'database', 'server', 'client',
    'frontend', 'backend', 'deployment', 'testing', 'ci/cd',
    'docker', 'kubernetes', 'cloud', 'aws', 'azure', 'gcp'
  ]);

  canApply(query: string, context: QueryContext): boolean {
    const words = query.toLowerCase().split(/\s+/);
    return words.some(word => this.technicalTerms.has(word));
  }

  async optimize(query: string, context: QueryContext): Promise<string> {
    const words = query.split(/\s+/);
    const optimizedWords = words.map(word => {
      const lowerWord = word.toLowerCase();
      if (this.technicalTerms.has(lowerWord)) {
        // Ajouter des précisions techniques si nécessaire
        switch (lowerWord) {
          case 'api':
            return 'API (Application Programming Interface)';
          case 'rest':
            return 'REST (Representational State Transfer)';
          case 'graphql':
            return 'GraphQL (Graph Query Language)';
          default:
            return word;
        }
      }
      return word;
    });

    return optimizedWords.join(' ');
  }
}

export class OptimizationStrategyManager {
  private strategies: OptimizationStrategy[];

  constructor() {
    this.strategies = [
      new QueryClarificationStrategy(),
      new ContextAwareStrategy(),
      new TechnicalPrecisionStrategy(),
    ].sort((a, b) => b.priority - a.priority);
  }

  async optimizeQuery(query: string, context: QueryContext): Promise<string> {
    let optimizedQuery = query;

    for (const strategy of this.strategies) {
      if (strategy.canApply(optimizedQuery, context)) {
        optimizedQuery = await strategy.optimize(optimizedQuery, context);
      }
    }

    return optimizedQuery;
  }

  getActiveStrategies(query: string, context: QueryContext): string[] {
    return this.strategies
      .filter(strategy => strategy.canApply(query, context))
      .map(strategy => strategy.name);
  }
} 