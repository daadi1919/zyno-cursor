import { z } from 'zod';
import { createHash, randomBytes } from 'crypto';
import { ErrorHandlingService } from './error-handling';
import { UserCache } from './user-cache';

export const UserRole = z.enum(['admin', 'user', 'readonly']);
export type UserRole = z.infer<typeof UserRole>;

export const User = z.object({
  id: z.string(),
  email: z.string().email(),
  role: UserRole,
  apiKey: z.string(),
  createdAt: z.number(),
  lastLogin: z.number().optional(),
});

export type User = z.infer<typeof User>;

interface AuthConfig {
  jwtSecret: string;
  tokenExpiration: number;
  apiKeyLength: number;
  cacheSize: number;
  cacheTTL: number;
}

export class AuthService {
  private users: Map<string, User>;
  private config: AuthConfig;
  private errorHandling: ErrorHandlingService;
  private cache: UserCache;

  constructor(
    errorHandling: ErrorHandlingService,
    config: Partial<AuthConfig> = {}
  ) {
    this.users = new Map();
    this.errorHandling = errorHandling;
    this.config = {
      jwtSecret: process.env.JWT_SECRET || randomBytes(32).toString('hex'),
      tokenExpiration: 24 * 60 * 60 * 1000, // 24 heures
      apiKeyLength: 32,
      cacheSize: 1000,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      ...config,
    };
    this.cache = new UserCache(this.config.cacheSize, this.config.cacheTTL);
  }

  async createUser(email: string, role: UserRole = 'user'): Promise<User> {
    return this.errorHandling.withRetry(async () => {
      if (this.getUserByEmail(email)) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }

      const user: User = {
        id: randomBytes(16).toString('hex'),
        email,
        role,
        apiKey: this.generateApiKey(),
        createdAt: Date.now(),
      };

      this.users.set(user.id, user);
      this.cache.set(user);
      return user;
    }, 'create-user');
  }

  async validateApiKey(apiKey: string): Promise<User | null> {
    return this.errorHandling.withRetry(() => {
      const user = Array.from(this.users.values()).find(
        u => u.apiKey === apiKey
      );
      if (user) {
        this.cache.set(user);
      }
      return Promise.resolve(user || null);
    }, 'validate-api-key');
  }

  async updateUserRole(userId: string, newRole: UserRole): Promise<User> {
    return this.errorHandling.withRetry(() => {
      const user = this.users.get(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      const updatedUser = { ...user, role: newRole };
      this.users.set(userId, updatedUser);
      this.cache.set(updatedUser);
      return Promise.resolve(updatedUser);
    }, 'update-user-role');
  }

  async rotateApiKey(userId: string): Promise<string> {
    return this.errorHandling.withRetry(() => {
      const user = this.users.get(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      const newApiKey = this.generateApiKey();
      const updatedUser = { ...user, apiKey: newApiKey };
      this.users.set(userId, updatedUser);
      this.cache.set(updatedUser);
      return Promise.resolve(newApiKey);
    }, 'rotate-api-key');
  }

  async deleteUser(userId: string): Promise<void> {
    return this.errorHandling.withRetry(() => {
      if (!this.users.has(userId)) {
        throw new Error('Utilisateur non trouvé');
      }
      this.users.delete(userId);
      this.cache.delete(userId);
      return Promise.resolve();
    }, 'delete-user');
  }

  getUserById(userId: string): User | undefined {
    const cachedUser = this.cache.get(userId);
    if (cachedUser) {
      return cachedUser;
    }

    const user = this.users.get(userId);
    if (user) {
      this.cache.set(user);
    }
    return user;
  }

  getUserByEmail(email: string): User | undefined {
    const user = Array.from(this.users.values()).find(u => u.email === email);
    if (user) {
      this.cache.set(user);
    }
    return user;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  private generateApiKey(): string {
    return randomBytes(this.config.apiKeyLength).toString('hex');
  }

  private hashPassword(password: string): string {
    return createHash('sha256')
      .update(password + this.config.jwtSecret)
      .digest('hex');
  }

  async validatePermissions(
    userId: string,
    requiredRole: UserRole
  ): Promise<boolean> {
    return this.errorHandling.withRetry(() => {
      const user = this.getUserById(userId);
      if (!user) {
        return Promise.resolve(false);
      }

      const roleHierarchy: Record<UserRole, number> = {
        admin: 3,
        user: 2,
        readonly: 1,
      };

      return Promise.resolve(
        roleHierarchy[user.role] >= roleHierarchy[requiredRole]
      );
    }, 'validate-permissions');
  }

  async updateLastLogin(userId: string): Promise<void> {
    return this.errorHandling.withRetry(() => {
      const user = this.users.get(userId);
      if (user) {
        const updatedUser = { ...user, lastLogin: Date.now() };
        this.users.set(userId, updatedUser);
        this.cache.set(updatedUser);
      }
      return Promise.resolve();
    }, 'update-last-login');
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  clearCache() {
    this.cache.clear();
  }

  cleanupCache() {
    this.cache.cleanup();
  }
} 