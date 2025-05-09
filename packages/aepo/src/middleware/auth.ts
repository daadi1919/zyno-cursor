import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (authService: AuthService) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(401).json({
          error: 'Clé API manquante',
        });
      }

      const user = await authService.validateApiKey(apiKey);
      if (!user) {
        return res.status(401).json({
          error: 'Clé API invalide',
        });
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      await authService.updateLastLogin(user.id);
      next();
    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'authentification',
      });
    }
  };
};

export const requireRole = (role: string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Non authentifié',
      });
    }

    const hasPermission = await authService.validatePermissions(
      req.user.id,
      role as any
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Permission insuffisante',
      });
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');
export const requireUser = requireRole('user');
export const requireReadonly = requireRole('readonly'); 