import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/session';
import { AuthService } from '../services/auth';
import { AccessLogger } from '../services/access-logger';

export const sessionMiddleware = (
  sessionService: SessionService,
  authService: AuthService,
  accessLogger: AccessLogger
) => {
  return {
    // Middleware pour valider la session
    validateSession: () => {
      return async (req: Request, res: Response, next: NextFunction) => {
        try {
          const sessionId = req.cookies?.sessionId;
          const token = req.headers.authorization?.split(' ')[1];

          if (!sessionId || !token) {
            return res.status(401).json({ error: 'Session non authentifiée' });
          }

          const session = await sessionService.validateSession(sessionId, token);

          if (!session) {
            return res.status(401).json({ error: 'Session invalide ou expirée' });
          }

          // Ajouter la session à la requête
          req.session = {
            ...req.session,
            id: session.id,
            userId: session.userId,
          };

          next();
        } catch (error) {
          console.error('Erreur lors de la validation de la session:', error);
          res.status(500).json({ error: 'Erreur lors de la validation de la session' });
        }
      };
    },

    // Middleware pour créer une session
    createSession: () => {
      return async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { email, password } = req.body;

          // Authentifier l'utilisateur
          const user = await authService.validateCredentials(email, password);

          if (!user) {
            return res.status(401).json({ error: 'Identifiants invalides' });
          }

          // Générer un token
          const token = await authService.generateToken(user);

          // Créer une session
          const session = await sessionService.createSession(
            user,
            token,
            req.headers['user-agent'],
            req.ip,
            {
              loginMethod: 'credentials',
            }
          );

          // Journaliser l'accès
          await accessLogger.logAccess(
            user,
            'login',
            '/auth/login',
            'success',
            undefined,
            {
              loginMethod: 'credentials',
              userAgent: req.headers['user-agent'],
              ipAddress: req.ip,
            }
          );

          // Définir le cookie de session
          res.cookie('sessionId', session.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: session.expiresAt.getTime() - Date.now(),
          });

          // Retourner le token
          res.json({ token });
        } catch (error) {
          console.error('Erreur lors de la création de la session:', error);
          res.status(500).json({ error: 'Erreur lors de la création de la session' });
        }
      };
    },

    // Middleware pour invalider une session
    invalidateSession: () => {
      return async (req: Request, res: Response, next: NextFunction) => {
        try {
          const sessionId = req.cookies?.sessionId;

          if (sessionId) {
            await sessionService.invalidateSession(sessionId);
            res.clearCookie('sessionId');
          }

          res.json({ message: 'Session invalidée avec succès' });
        } catch (error) {
          console.error('Erreur lors de l\'invalidation de la session:', error);
          res.status(500).json({ error: 'Erreur lors de l\'invalidation de la session' });
        }
      };
    },

    // Middleware pour obtenir les sessions d'un utilisateur
    getUserSessions: () => {
      return async (req: Request, res: Response, next: NextFunction) => {
        try {
          const userId = req.session?.userId;

          if (!userId) {
            return res.status(401).json({ error: 'Utilisateur non authentifié' });
          }

          const sessions = await sessionService.getUserSessions(userId);
          res.json({ sessions });
        } catch (error) {
          console.error('Erreur lors de la récupération des sessions:', error);
          res.status(500).json({ error: 'Erreur lors de la récupération des sessions' });
        }
      };
    },

    // Middleware pour obtenir les statistiques des sessions
    getSessionStats: () => {
      return async (_req: Request, res: Response, next: NextFunction) => {
        try {
          const stats = await sessionService.getSessionStats();
          res.json(stats);
        } catch (error) {
          console.error('Erreur lors de la récupération des statistiques:', error);
          res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
        }
      };
    },
  };
}; 