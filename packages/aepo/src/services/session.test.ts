import { SessionService } from './session';
import { ErrorHandlingService } from './error-handling';
import { User } from './auth';

describe('SessionService', () => {
  let sessionService: SessionService;
  let errorHandling: ErrorHandlingService;
  let mockUser: User;

  beforeEach(() => {
    errorHandling = new ErrorHandlingService();
    sessionService = new SessionService(errorHandling);
    mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'user',
      apiKey: 'test-api-key',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('createSession', () => {
    it('devrait créer une nouvelle session', async () => {
      const session = await sessionService.createSession(
        mockUser,
        'test-token',
        'test-user-agent',
        '127.0.0.1'
      );

      expect(session).toBeDefined();
      expect(session.userId).toBe(mockUser.id);
      expect(session.token).toBe('test-token');
      expect(session.userAgent).toBe('test-user-agent');
      expect(session.ipAddress).toBe('127.0.0.1');
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastActivity).toBeInstanceOf(Date);
    });

    it('devrait limiter le nombre de sessions par utilisateur', async () => {
      // Créer le nombre maximum de sessions
      for (let i = 0; i < 5; i++) {
        await sessionService.createSession(
          mockUser,
          `token-${i}`,
          'test-user-agent',
          '127.0.0.1'
        );
      }

      // Créer une session supplémentaire
      const newSession = await sessionService.createSession(
        mockUser,
        'new-token',
        'test-user-agent',
        '127.0.0.1'
      );

      const userSessions = await sessionService.getUserSessions(mockUser.id);
      expect(userSessions.length).toBe(5);
      expect(userSessions.some((s) => s.token === 'new-token')).toBe(true);
    });
  });

  describe('validateSession', () => {
    it('devrait valider une session valide', async () => {
      const session = await sessionService.createSession(
        mockUser,
        'test-token',
        'test-user-agent',
        '127.0.0.1'
      );

      const validatedSession = await sessionService.validateSession(
        session.id,
        'test-token'
      );

      expect(validatedSession).toBeDefined();
      expect(validatedSession?.id).toBe(session.id);
    });

    it('devrait rejeter une session avec un token invalide', async () => {
      const session = await sessionService.createSession(
        mockUser,
        'test-token',
        'test-user-agent',
        '127.0.0.1'
      );

      const validatedSession = await sessionService.validateSession(
        session.id,
        'invalid-token'
      );

      expect(validatedSession).toBeNull();
    });

    it('devrait rejeter une session expirée', async () => {
      const sessionService = new SessionService(errorHandling, 0); // TTL de 0 ms
      const session = await sessionService.createSession(
        mockUser,
        'test-token',
        'test-user-agent',
        '127.0.0.1'
      );

      const validatedSession = await sessionService.validateSession(
        session.id,
        'test-token'
      );

      expect(validatedSession).toBeNull();
    });
  });

  describe('invalidateSession', () => {
    it('devrait invalider une session spécifique', async () => {
      const session = await sessionService.createSession(
        mockUser,
        'test-token',
        'test-user-agent',
        '127.0.0.1'
      );

      await sessionService.invalidateSession(session.id);

      const validatedSession = await sessionService.validateSession(
        session.id,
        'test-token'
      );
      expect(validatedSession).toBeNull();
    });
  });

  describe('invalidateUserSessions', () => {
    it('devrait invalider toutes les sessions d\'un utilisateur', async () => {
      // Créer plusieurs sessions pour l'utilisateur
      for (let i = 0; i < 3; i++) {
        await sessionService.createSession(
          mockUser,
          `token-${i}`,
          'test-user-agent',
          '127.0.0.1'
        );
      }

      await sessionService.invalidateUserSessions(mockUser.id);

      const userSessions = await sessionService.getUserSessions(mockUser.id);
      expect(userSessions.length).toBe(0);
    });
  });

  describe('getSessionStats', () => {
    it('devrait retourner les statistiques correctes', async () => {
      // Créer quelques sessions
      for (let i = 0; i < 3; i++) {
        await sessionService.createSession(
          mockUser,
          `token-${i}`,
          'test-user-agent',
          '127.0.0.1'
        );
      }

      const stats = await sessionService.getSessionStats();
      expect(stats.totalSessions).toBe(3);
      expect(stats.activeSessions).toBe(3);
      expect(stats.expiredSessions).toBe(0);
    });

    it('devrait compter correctement les sessions expirées', async () => {
      const sessionService = new SessionService(errorHandling, 0); // TTL de 0 ms
      await sessionService.createSession(
        mockUser,
        'test-token',
        'test-user-agent',
        '127.0.0.1'
      );

      const stats = await sessionService.getSessionStats();
      expect(stats.totalSessions).toBe(1);
      expect(stats.activeSessions).toBe(0);
      expect(stats.expiredSessions).toBe(1);
    });
  });
}); 