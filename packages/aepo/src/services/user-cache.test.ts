import { UserCache } from './user-cache';
import { AuthService } from './auth';
import { ErrorHandlingService } from './error-handling';

describe('UserCache', () => {
  let userCache: UserCache;
  let authService: AuthService;
  let errorHandlingService: ErrorHandlingService;

  beforeEach(() => {
    errorHandlingService = new ErrorHandlingService();
    authService = new AuthService(errorHandlingService);
    userCache = new UserCache(2, 1000); // Taille max de 2, TTL de 1 seconde
  });

  describe('get and set', () => {
    it('should store and retrieve user', async () => {
      const user = await authService.createUser('test@example.com');
      userCache.set(user);
      const cachedUser = userCache.get(user.id);
      expect(cachedUser).toBeDefined();
      expect(cachedUser?.id).toBe(user.id);
    });

    it('should return null for non-existent user', () => {
      const cachedUser = userCache.get('non-existent-id');
      expect(cachedUser).toBeNull();
    });

    it('should return null for expired entry', async () => {
      const user = await authService.createUser('test@example.com');
      userCache.set(user);
      await new Promise(resolve => setTimeout(resolve, 1100)); // Attendre plus que le TTL
      const cachedUser = userCache.get(user.id);
      expect(cachedUser).toBeNull();
    });
  });

  describe('eviction', () => {
    it('should evict least recently used when cache is full', async () => {
      const user1 = await authService.createUser('user1@example.com');
      const user2 = await authService.createUser('user2@example.com');
      const user3 = await authService.createUser('user3@example.com');

      userCache.set(user1);
      userCache.set(user2);
      userCache.set(user3);

      expect(userCache.get(user1.id)).toBeNull(); // Premier utilisateur devrait être évincé
      expect(userCache.get(user2.id)).toBeDefined();
      expect(userCache.get(user3.id)).toBeDefined();
    });

    it('should update last accessed time on get', async () => {
      const user1 = await authService.createUser('user1@example.com');
      const user2 = await authService.createUser('user2@example.com');
      const user3 = await authService.createUser('user3@example.com');

      userCache.set(user1);
      userCache.set(user2);
      userCache.get(user1.id); // Mettre à jour le temps d'accès
      userCache.set(user3);

      expect(userCache.get(user1.id)).toBeDefined(); // user1 devrait toujours être présent
      expect(userCache.get(user2.id)).toBeNull(); // user2 devrait être évincé
      expect(userCache.get(user3.id)).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      const user = await authService.createUser('test@example.com');
      userCache.set(user);
      await new Promise(resolve => setTimeout(resolve, 1100));
      userCache.cleanup();
      expect(userCache.get(user.id)).toBeNull();
    });
  });

  describe('stats', () => {
    it('should track cache statistics', async () => {
      const user = await authService.createUser('test@example.com');
      userCache.set(user);
      userCache.get(user.id);
      userCache.get('non-existent-id');

      const stats = userCache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(0);
      expect(stats.hitRate).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      const user = await authService.createUser('test@example.com');
      userCache.set(user);
      userCache.clear();
      expect(userCache.get(user.id)).toBeNull();
      expect(userCache.getStats().size).toBe(0);
    });
  });
}); 