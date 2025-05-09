import { QueryContext, QueryResult } from '@zyno/types';

interface CacheEntry {
  result: QueryResult;
  timestamp: number;
  hitCount: number;
  lastAccessed: number;
}

export class QueryCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 1000, ttl: number = 24 * 60 * 60 * 1000) { // 24 heures par défaut
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  private generateKey(query: string, context: QueryContext): string {
    // Créer une clé unique basée sur la requête et le contexte
    const contextKey = `${context.userId}:${context.sessionId}`;
    return `${contextKey}:${query}`;
  }

  async get(query: string, context: QueryContext): Promise<QueryResult | null> {
    const key = this.generateKey(query, context);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Vérifier si l'entrée a expiré
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Mettre à jour les métriques
    entry.hitCount++;
    entry.lastAccessed = Date.now();

    return entry.result;
  }

  async set(query: string, context: QueryContext, result: QueryResult): Promise<void> {
    const key = this.generateKey(query, context);

    // Vérifier si le cache est plein
    if (this.cache.size >= this.maxSize) {
      this.evictLeastValuable();
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hitCount: 1,
      lastAccessed: Date.now(),
    });
  }

  private evictLeastValuable(): void {
    let leastValuableKey: string | null = null;
    let lowestScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Calculer un score basé sur la fréquence d'accès et la fraîcheur
      const age = Date.now() - entry.timestamp;
      const score = entry.hitCount / (age + 1); // +1 pour éviter la division par zéro

      if (score < lowestScore) {
        lowestScore = score;
        leastValuableKey = key;
      }
    }

    if (leastValuableKey) {
      this.cache.delete(leastValuableKey);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async getStats(): Promise<{
    size: number;
    hitCount: number;
    missCount: number;
    averageHitCount: number;
  }> {
    let totalHitCount = 0;
    let missCount = 0;

    for (const entry of this.cache.values()) {
      totalHitCount += entry.hitCount;
    }

    return {
      size: this.cache.size,
      hitCount: totalHitCount,
      missCount,
      averageHitCount: this.cache.size > 0 ? totalHitCount / this.cache.size : 0,
    };
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
} 