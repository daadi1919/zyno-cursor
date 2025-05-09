import { Request, Response, NextFunction } from 'express';
import { AccessLogger } from '../services/access-logger';
import { AuthenticatedRequest } from './auth';

export const accessLoggerMiddleware = (accessLogger: AccessLogger) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalEnd = res.end;

    // Intercepter la fin de la réponse
    res.end = function (chunk?: any, encoding?: any, callback?: any) {
      const duration = Date.now() - startTime;
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';

      // Récupérer l'utilisateur si authentifié
      const user = (req as AuthenticatedRequest).user;

      if (user) {
        accessLogger.logAccess(
          user,
          req.method,
          req.path,
          status,
          status === 'failure' ? res.statusMessage : undefined,
          {
            duration,
            statusCode: res.statusCode,
            query: req.query,
            params: req.params,
          },
          req.ip,
          req.get('user-agent')
        ).catch(console.error);
      }

      // Restaurer la fonction end originale
      res.end = originalEnd;
      return res.end(chunk, encoding, callback);
    };

    next();
  };
}; 