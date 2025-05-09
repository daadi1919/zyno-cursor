import { Request, Response, NextFunction } from 'express';
import { OAuthService } from '../services/oauth';
import { AuthService } from '../services/auth';
import { AccessLogger } from '../services/access-logger';
import crypto from 'crypto';

export const oauthMiddleware = (
  oauthService: OAuthService,
  authService: AuthService,
  accessLogger: AccessLogger
) => {
  return {
    // Rediriger vers le fournisseur OAuth
    initiateAuth: (provider: string) => {
      return async (req: Request, res: Response) => {
        try {
          // Générer un état aléatoire pour la sécurité
          const state = crypto.randomBytes(32).toString('hex');
          
          // Stocker l'état dans la session
          req.session = req.session || {};
          req.session.oauthState = state;

          // Générer l'URL d'autorisation
          const authUrl = oauthService.getAuthorizationUrl(provider, state);
          
          // Rediriger vers le fournisseur
          res.redirect(authUrl);
        } catch (error) {
          console.error('Erreur lors de l\'initiation OAuth:', error);
          res.status(500).json({ error: 'Erreur lors de l\'authentification' });
        }
      };
    },

    // Gérer le callback OAuth
    handleCallback: (provider: string) => {
      return async (req: Request, res: Response) => {
        try {
          const { code, state } = req.query;

          // Vérifier l'état pour la sécurité
          if (!req.session?.oauthState || state !== req.session.oauthState) {
            throw new Error('État OAuth invalide');
          }

          // Nettoyer la session
          delete req.session.oauthState;

          // Échanger le code contre un token et récupérer les infos utilisateur
          const { token, userInfo } = await oauthService.handleCallback(
            provider,
            code as string
          );

          // Créer ou mettre à jour l'utilisateur
          let user = await authService.getUserByEmail(userInfo.email);
          
          if (!user) {
            // Créer un nouvel utilisateur
            user = await authService.createUser(userInfo.email, 'user');
          }

          // Journaliser l'accès
          await accessLogger.logAccess(
            user,
            'oauth_login',
            `/auth/${provider}/callback`,
            'success',
            undefined,
            {
              provider,
              oauthId: userInfo.id,
            }
          );

          // Générer un token JWT
          const jwtToken = await authService.generateToken(user);

          // Rediriger vers le frontend avec le token
          res.redirect(`/auth/callback?token=${jwtToken}`);
        } catch (error) {
          console.error('Erreur lors du callback OAuth:', error);
          res.status(500).json({ error: 'Erreur lors de l\'authentification' });
        }
      };
    },

    // Rafraîchir un token OAuth
    refreshToken: (provider: string) => {
      return async (req: Request, res: Response) => {
        try {
          const { refreshToken } = req.body;

          if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token manquant' });
          }

          // Rafraîchir le token
          const newToken = await oauthService.refreshToken(provider, refreshToken);

          res.json(newToken);
        } catch (error) {
          console.error('Erreur lors du rafraîchissement du token:', error);
          res.status(500).json({ error: 'Erreur lors du rafraîchissement du token' });
        }
      };
    },

    // Obtenir la liste des fournisseurs disponibles
    getProviders: () => {
      return async (_req: Request, res: Response) => {
        try {
          const providers = oauthService.getAvailableProviders();
          res.json({ providers });
        } catch (error) {
          console.error('Erreur lors de la récupération des fournisseurs:', error);
          res.status(500).json({ error: 'Erreur lors de la récupération des fournisseurs' });
        }
      };
    },
  };
}; 