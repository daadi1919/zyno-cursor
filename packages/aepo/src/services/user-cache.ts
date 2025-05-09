import { User } from './auth';

interface CacheEntry {
  user: User;
  lastAccessed: number;
}

export class UserCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 1000, ttl: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(userId: string): User | null {
    const entry = this.cache.get(userId);
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry.lastAccessed)) {
      this.cache.delete(userId);
      return null;
    }

    entry.lastAccessed = Date.now();
    return entry.user;
  }

  set(user: User): void {
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(user.id, {
      user,
      lastAccessed: Date.now(),
    });
  }

  delete(userId: string): void {
    this.cache.delete(userId);
  }

  clear(): void {
    this.cache.clear();
  }

  private isExpired(lastAccessed: number): boolean {
    return Date.now() - lastAccessed > this.ttl;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  getStats(): {
    size: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
  } {
    const total = this.cache.size;
    const hits = Array.from(this.cache.values()).filter(
      entry => !this.isExpired(entry.lastAccessed)
    ).length;
    const misses = total - hits;

    return {
      size: total,
      hitCount: hits,
      missCount: misses,
      hitRate: total > 0 ? hits / total : 0,
    };
  }

  cleanup(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry.lastAccessed)) {
        this.cache.delete(key);
      }
    }
  }
} 