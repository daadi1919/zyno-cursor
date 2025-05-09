import { OAuthService } from './oauth';
import { ErrorHandlingService } from './error-handling';

describe('OAuthService', () => {
  let oauthService: OAuthService;
  let errorHandling: ErrorHandlingService;

  const mockProviderConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/callback',
    scope: ['email', 'profile'],
    authorizationUrl: 'https://oauth.test/authorize',
    tokenUrl: 'https://oauth.test/token',
    userInfoUrl: 'https://oauth.test/userinfo',
  };

  beforeEach(() => {
    errorHandling = new ErrorHandlingService();
    oauthService = new OAuthService(errorHandling);
  });

  describe('registerProvider', () => {
    it('devrait enregistrer un fournisseur valide', async () => {
      await oauthService.registerProvider('test', mockProviderConfig);
      expect(oauthService.getAvailableProviders()).toContain('test');
    });

    it('devrait rejeter une configuration invalide', async () => {
      const invalidConfig = { ...mockProviderConfig, clientId: '' };
      await expect(
        oauthService.registerProvider('test', invalidConfig)
      ).rejects.toThrow();
    });
  });

  describe('getAuthorizationUrl', () => {
    beforeEach(async () => {
      await oauthService.registerProvider('test', mockProviderConfig);
    });

    it('devrait générer une URL d\'autorisation valide', () => {
      const state = 'test-state';
      const url = oauthService.getAuthorizationUrl('test', state);
      const parsedUrl = new URL(url);

      expect(parsedUrl.origin + parsedUrl.pathname).toBe(mockProviderConfig.authorizationUrl);
      expect(parsedUrl.searchParams.get('client_id')).toBe(mockProviderConfig.clientId);
      expect(parsedUrl.searchParams.get('redirect_uri')).toBe(mockProviderConfig.redirectUri);
      expect(parsedUrl.searchParams.get('response_type')).toBe('code');
      expect(parsedUrl.searchParams.get('scope')).toBe(mockProviderConfig.scope.join(' '));
      expect(parsedUrl.searchParams.get('state')).toBe(state);
    });

    it('devrait rejeter un fournisseur non configuré', () => {
      expect(() => oauthService.getAuthorizationUrl('unknown', 'state')).toThrow();
    });
  });

  describe('handleCallback', () => {
    beforeEach(async () => {
      await oauthService.registerProvider('test', mockProviderConfig);
      global.fetch = jest.fn();
    });

    it('devrait échanger le code contre un token et récupérer les infos utilisateur', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'email profile',
      };

      const mockUserInfoResponse = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://test.com/avatar.jpg',
      };

      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTokenResponse),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserInfoResponse),
          })
        );

      const result = await oauthService.handleCallback('test', 'test-code');

      expect(result.token).toEqual({
        accessToken: mockTokenResponse.access_token,
        refreshToken: mockTokenResponse.refresh_token,
        expiresIn: mockTokenResponse.expires_in,
        tokenType: mockTokenResponse.token_type,
        scope: mockTokenResponse.scope.split(' '),
      });

      expect(result.userInfo).toEqual({
        ...mockUserInfoResponse,
        provider: 'test',
      });
    });

    it('devrait gérer les erreurs de l\'API', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Invalid code',
        })
      );

      await expect(
        oauthService.handleCallback('test', 'invalid-code')
      ).rejects.toThrow('Erreur lors de l\'échange du code');
    });
  });

  describe('refreshToken', () => {
    beforeEach(async () => {
      await oauthService.registerProvider('test', mockProviderConfig);
      global.fetch = jest.fn();
    });

    it('devrait rafraîchir un token valide', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'email profile',
      };

      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      const result = await oauthService.refreshToken('test', 'old-refresh-token');

      expect(result).toEqual({
        accessToken: mockResponse.access_token,
        refreshToken: mockResponse.refresh_token,
        expiresIn: mockResponse.expires_in,
        tokenType: mockResponse.token_type,
        scope: mockResponse.scope.split(' '),
      });
    });

    it('devrait gérer les erreurs de rafraîchissement', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Invalid refresh token',
        })
      );

      await expect(
        oauthService.refreshToken('test', 'invalid-refresh-token')
      ).rejects.toThrow('Erreur lors du rafraîchissement du token');
    });
  });
}); 