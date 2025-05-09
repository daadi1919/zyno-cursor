import { Request, Response } from 'express';
import { OAuthService } from '../services/oauth';
import { AuthService } from '../services/auth';
import { AccessLogger } from '../services/access-logger';
import { oauthMiddleware } from './oauth';

describe('OAuth Middleware', () => {
  let mockOAuthService: jest.Mocked<OAuthService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockAccessLogger: jest.Mocked<AccessLogger>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockOAuthService = {
      getAuthorizationUrl: jest.fn(),
      handleCallback: jest.fn(),
      refreshToken: jest.fn(),
      getAvailableProviders: jest.fn(),
    } as any;

    mockAuthService = {
      getUserByEmail: jest.fn(),
      createUser: jest.fn(),
      generateToken: jest.fn(),
    } as any;

    mockAccessLogger = {
      logAccess: jest.fn(),
    } as any;

    mockRequest = {
      session: {},
      query: {},
      body: {},
    };

    mockResponse = {
      redirect: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('initiateAuth', () => {
    it('devrait rediriger vers l\'URL d\'autorisation', async () => {
      const middleware = oauthMiddleware(
        mockOAuthService,
        mockAuthService,
        mockAccessLogger
      );

      mockOAuthService.getAuthorizationUrl.mockResolvedValue('https://oauth-provider.com/auth');

      await middleware.initiateAuth('google')(mockRequest as Request, mockResponse as Response);

      expect(mockRequest.session?.oauthState).toBeDefined();
      expect(mockOAuthService.getAuthorizationUrl).toHaveBeenCalledWith(
        'google',
        expect.any(String)
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith('https://oauth-provider.com/auth');
    });

    it('devrait gérer les erreurs', async () => {
      const middleware = oauthMiddleware(
        mockOAuthService,
        mockAuthService,
        mockAccessLogger
      );

      mockOAuthService.getAuthorizationUrl.mockRejectedValue(new Error('Erreur OAuth'));

      await middleware.initiateAuth('google')(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Erreur lors de l\'authentification',
      });
    });
  });

  describe('handleCallback', () => {
    it('devrait gérer le callback avec succès', async () => {
      const middleware = oauthMiddleware(
        mockOAuthService,
        mockAuthService,
        mockAccessLogger
      );

      const state = 'test-state';
      mockRequest.session = { oauthState: state };
      mockRequest.query = { code: 'auth-code', state };

      const mockUserInfo = {
        email: 'test@example.com',
        id: 'oauth-id',
      };

      const mockToken = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockOAuthService.handleCallback.mockResolvedValue({
        token: mockToken,
        userInfo: mockUserInfo,
      });

      mockAuthService.getUserByEmail.mockResolvedValue(null);
      mockAuthService.createUser.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        role: 'user',
      });

      mockAuthService.generateToken.mockResolvedValue('jwt-token');

      await middleware.handleCallback('google')(mockRequest as Request, mockResponse as Response);

      expect(mockOAuthService.handleCallback).toHaveBeenCalledWith('google', 'auth-code');
      expect(mockAuthService.createUser).toHaveBeenCalledWith('test@example.com', 'user');
      expect(mockAccessLogger.logAccess).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith('/auth/callback?token=jwt-token');
    });

    it('devrait rejeter un état invalide', async () => {
      const middleware = oauthMiddleware(
        mockOAuthService,
        mockAuthService,
        mockAccessLogger
      );

      mockRequest.session = { oauthState: 'valid-state' };
      mockRequest.query = { code: 'auth-code', state: 'invalid-state' };

      await middleware.handleCallback('google')(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Erreur lors de l\'authentification',
      });
    });
  });

  describe('refreshToken', () => {
    it('devrait rafraîchir le token avec succès', async () => {
      const middleware = oauthMiddleware(
        mockOAuthService,
        mockAuthService,
        mockAccessLogger
      );

      const mockNewToken = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockRequest.body = { refreshToken: 'old-refresh-token' };
      mockOAuthService.refreshToken.mockResolvedValue(mockNewToken);

      await middleware.refreshToken('google')(mockRequest as Request, mockResponse as Response);

      expect(mockOAuthService.refreshToken).toHaveBeenCalledWith('google', 'old-refresh-token');
      expect(mockResponse.json).toHaveBeenCalledWith(mockNewToken);
    });

    it('devrait rejeter une requête sans refresh token', async () => {
      const middleware = oauthMiddleware(
        mockOAuthService,
        mockAuthService,
        mockAccessLogger
      );

      mockRequest.body = {};

      await middleware.refreshToken('google')(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Refresh token manquant',
      });
    });
  });

  describe('getProviders', () => {
    it('devrait retourner la liste des fournisseurs', async () => {
      const middleware = oauthMiddleware(
        mockOAuthService,
        mockAuthService,
        mockAccessLogger
      );

      const mockProviders = ['google', 'github', 'facebook'];
      mockOAuthService.getAvailableProviders.mockReturnValue(mockProviders);

      await middleware.getProviders()(mockRequest as Request, mockResponse as Response);

      expect(mockOAuthService.getAvailableProviders).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({ providers: mockProviders });
    });
  });
}); 