import { Request, Response } from 'express';
import { SessionService } from '../services/session';
import { AuthService } from '../services/auth';
import { AccessLogger } from '../services/access-logger';
import { sessionMiddleware } from './session';
import { User } from '../services/auth';

describe('SessionMiddleware', () => {
  let mockSessionService: jest.Mocked<SessionService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockAccessLogger: jest.Mocked<AccessLogger>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockSessionService = {
      validateSession: jest.fn(),
      createSession: jest.fn(),
      invalidateSession: jest.fn(),
      getUserSessions: jest.fn(),
      getSessionStats: jest.fn(),
    } as any;

    mockAuthService = {
      validateCredentials: jest.fn(),
      generateToken: jest.fn(),
    } as any;

    mockAccessLogger = {
      logAccess: jest.fn(),
    } as any;

    mockRequest = {
      cookies: {},
      headers: {},
      body: {},
      session: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('validateSession', () => {
    it('devrait valider une session valide', async () => {
      const middleware = sessionMiddleware(
        mockSessionService,
        mockAuthService,
        mockAccessLogger
      );

      const sessionId = 'valid-session-id';
      const token = 'valid-token';
      const userId = 'user-123';

      mockRequest.cookies = { sessionId };
      mockRequest.headers = { authorization: `Bearer ${token}` };

      mockSessionService.validateSession.mockResolvedValue({
        id: sessionId,
        userId,
        token,
        expiresAt: new Date(),
      });

      await middleware.validateSession()(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockSessionService.validateSession).toHaveBeenCalledWith(sessionId, token);
      expect(mockRequest.session).toEqual({
        id: sessionId,
        userId,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('devrait rejeter une session invalide', async () => {
      const middleware = sessionMiddleware(
        mockSessionService,
        mockAuthService,
        mockAccessLogger
      );

      mockRequest.cookies = {};
      mockRequest.headers = {};

      await middleware.validateSession()(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Session non authentifiée',
      });
    });
  });

  describe('createSession', () => {
    it('devrait créer une session avec succès', async () => {
      const middleware = sessionMiddleware(
        mockSessionService,
        mockAuthService,
        mockAccessLogger
      );

      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
      };

      const token = 'new-token';
      const sessionId = 'new-session-id';

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockRequest.headers = {
        'user-agent': 'test-agent',
      };

      mockRequest.ip = '127.0.0.1';

      mockAuthService.validateCredentials.mockResolvedValue(user);
      mockAuthService.generateToken.mockResolvedValue(token);
      mockSessionService.createSession.mockResolvedValue({
        id: sessionId,
        userId: user.id,
        token,
        expiresAt: new Date(),
      });

      await middleware.createSession()(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.validateCredentials).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
      expect(mockAuthService.generateToken).toHaveBeenCalledWith(user);
      expect(mockSessionService.createSession).toHaveBeenCalled();
      expect(mockAccessLogger.logAccess).toHaveBeenCalled();
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({ token });
    });

    it('devrait rejeter des identifiants invalides', async () => {
      const middleware = sessionMiddleware(
        mockSessionService,
        mockAuthService,
        mockAccessLogger
      );

      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      mockAuthService.validateCredentials.mockResolvedValue(null);

      await middleware.createSession()(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Identifiants invalides',
      });
    });
  });

  describe('invalidateSession', () => {
    it('devrait invalider une session existante', async () => {
      const middleware = sessionMiddleware(
        mockSessionService,
        mockAuthService,
        mockAccessLogger
      );

      const sessionId = 'session-to-invalidate';
      mockRequest.cookies = { sessionId };

      await middleware.invalidateSession()(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockSessionService.invalidateSession).toHaveBeenCalledWith(sessionId);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('sessionId');
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Session invalidée avec succès',
      });
    });
  });

  describe('getUserSessions', () => {
    it('devrait retourner les sessions d\'un utilisateur', async () => {
      const middleware = sessionMiddleware(
        mockSessionService,
        mockAuthService,
        mockAccessLogger
      );

      const userId = 'user-123';
      const sessions = [
        {
          id: 'session-1',
          userId,
          token: 'token-1',
          expiresAt: new Date(),
        },
        {
          id: 'session-2',
          userId,
          token: 'token-2',
          expiresAt: new Date(),
        },
      ];

      mockRequest.session = { userId };
      mockSessionService.getUserSessions.mockResolvedValue(sessions);

      await middleware.getUserSessions()(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockSessionService.getUserSessions).toHaveBeenCalledWith(userId);
      expect(mockResponse.json).toHaveBeenCalledWith({ sessions });
    });

    it('devrait rejeter une requête non authentifiée', async () => {
      const middleware = sessionMiddleware(
        mockSessionService,
        mockAuthService,
        mockAccessLogger
      );

      mockRequest.session = {};

      await middleware.getUserSessions()(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Utilisateur non authentifié',
      });
    });
  });

  describe('getSessionStats', () => {
    it('devrait retourner les statistiques des sessions', async () => {
      const middleware = sessionMiddleware(
        mockSessionService,
        mockAuthService,
        mockAccessLogger
      );

      const stats = {
        totalSessions: 10,
        activeSessions: 5,
        expiredSessions: 5,
      };

      mockSessionService.getSessionStats.mockResolvedValue(stats);

      await middleware.getSessionStats()(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockSessionService.getSessionStats).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(stats);
    });
  });
}); 