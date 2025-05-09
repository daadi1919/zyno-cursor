import { z } from 'zod';
import { ErrorHandlingService } from './error-handling';
import { User } from './auth';

// Schéma de validation pour les sessions
const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.date(),
  createdAt: z.date(),
  lastActivity: z.date(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

type Session = z.infer<typeof SessionSchema>;

export class SessionService {
  private readonly sessions: Map<string, Session>;
  private readonly errorHandling: ErrorHandlingService;
  private readonly sessionTTL: number;
  private readonly maxSessionsPerUser: number;

  constructor(
    errorHandling: ErrorHandlingService,
    sessionTTL: number = 24 * 60 * 60 * 1000, // 24 heures par défaut
    maxSessionsPerUser: number = 5
  ) {
    this.sessions = new Map();
    this.errorHandling = errorHandling;
    this.sessionTTL = sessionTTL;
    this.maxSessionsPerUser = maxSessionsPerUser;
  }

  async createSession(
    user: User,
    token: string,
    userAgent?: string,
    ipAddress?: string,
    metadata?: Record<string, unknown>
  ): Promise<Session> {
    return this.errorHandling.withRetry(
      async () => {
        // Nettoyer les sessions expirées
        await this.cleanupExpiredSessions();

        // Vérifier le nombre de sessions actives pour l'utilisateur
        const userSessions = Array.from(this.sessions.values()).filter(
          (session) => session.userId === user.id
        );

        if (userSessions.length >= this.maxSessionsPerUser) {
          // Supprimer la session la plus ancienne
          const oldestSession = userSessions.reduce((oldest, current) =>
            current.createdAt < oldest.createdAt ? current : oldest
          );
          this.sessions.delete(oldestSession.id);
        }

        const session: Session = {
          id: crypto.randomUUID(),
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + this.sessionTTL),
          createdAt: new Date(),
          lastActivity: new Date(),
          userAgent,
          ipAddress,
          metadata,
        };

        this.sessions.set(session.id, session);
        return session;
      },
      'create-session'
    );
  }

  async validateSession(sessionId: string, token: string): Promise<Session | null> {
    return this.errorHandling.withRetry(
      async () => {
        const session = this.sessions.get(sessionId);

        if (!session) {
          return null;
        }

        if (session.token !== token) {
          return null;
        }

        if (session.expiresAt < new Date()) {
          this.sessions.delete(sessionId);
          return null;
        }

        // Mettre à jour la dernière activité
        session.lastActivity = new Date();
        this.sessions.set(sessionId, session);

        return session;
      },
      'validate-session'
    );
  }

  async invalidateSession(sessionId: string): Promise<void> {
    return this.errorHandling.withRetry(
      async () => {
        this.sessions.delete(sessionId);
      },
      'invalidate-session'
    );
  }

  async invalidateUserSessions(userId: string): Promise<void> {
    return this.errorHandling.withRetry(
      async () => {
        for (const [id, session] of this.sessions.entries()) {
          if (session.userId === userId) {
            this.sessions.delete(id);
          }
        }
      },
      'invalidate-user-sessions'
    );
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return this.errorHandling.withRetry(
      async () => {
        return Array.from(this.sessions.values()).filter(
          (session) => session.userId === userId
        );
      },
      'get-user-sessions'
    );
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
      }
    }
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  }> {
    const now = new Date();
    const sessions = Array.from(this.sessions.values());
    const activeSessions = sessions.filter((session) => session.expiresAt > now);

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      expiredSessions: sessions.length - activeSessions.length,
    };
  }
} 