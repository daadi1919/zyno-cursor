import { z } from 'zod';
import { ErrorHandlingService } from './error-handling';
import { User } from './auth';

// Schéma de validation pour les configurations OAuth
const OAuthProviderConfigSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  redirectUri: z.string().url(),
  scope: z.array(z.string()),
  authorizationUrl: z.string().url(),
  tokenUrl: z.string().url(),
  userInfoUrl: z.string().url(),
});

type OAuthProviderConfig = z.infer<typeof OAuthProviderConfigSchema>;

interface OAuthUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: string;
}

interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string[];
}

export class OAuthService {
  private readonly providers: Map<string, OAuthProviderConfig>;
  private readonly errorHandling: ErrorHandlingService;

  constructor(errorHandling: ErrorHandlingService) {
    this.providers = new Map();
    this.errorHandling = errorHandling;
  }

  async registerProvider(
    name: string,
    config: OAuthProviderConfig
  ): Promise<void> {
    try {
      const validatedConfig = OAuthProviderConfigSchema.parse(config);
      this.providers.set(name, validatedConfig);
    } catch (error) {
      throw new Error(`Configuration OAuth invalide pour ${name}: ${error}`);
    }
  }

  getAuthorizationUrl(provider: string, state: string): string {
    const config = this.getProviderConfig(provider);
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope.join(' '),
      state,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async handleCallback(
    provider: string,
    code: string
  ): Promise<{ token: OAuthToken; userInfo: OAuthUserInfo }> {
    const config = this.getProviderConfig(provider);

    // Échanger le code contre un token
    const token = await this.errorHandling.withRetry(
      async () => {
        const response = await fetch(config.tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            redirect_uri: config.redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (!response.ok) {
          throw new Error(`Erreur lors de l'échange du code: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
          tokenType: data.token_type,
          scope: data.scope.split(' '),
        };
      },
      'oauth-token-exchange'
    );

    // Récupérer les informations utilisateur
    const userInfo = await this.errorHandling.withRetry(
      async () => {
        const response = await fetch(config.userInfoUrl, {
          headers: {
            Authorization: `${token.tokenType} ${token.accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Erreur lors de la récupération des infos utilisateur: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          picture: data.picture,
          provider,
        };
      },
      'oauth-user-info'
    );

    return { token, userInfo };
  }

  async refreshToken(
    provider: string,
    refreshToken: string
  ): Promise<OAuthToken> {
    const config = this.getProviderConfig(provider);

    return this.errorHandling.withRetry(
      async () => {
        const response = await fetch(config.tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (!response.ok) {
          throw new Error(`Erreur lors du rafraîchissement du token: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
          tokenType: data.token_type,
          scope: data.scope.split(' '),
        };
      },
      'oauth-refresh-token'
    );
  }

  private getProviderConfig(provider: string): OAuthProviderConfig {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`Fournisseur OAuth non configuré: ${provider}`);
    }
    return config;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
} 