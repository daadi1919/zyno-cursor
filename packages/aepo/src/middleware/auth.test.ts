import { Request, Response } from 'express';
import { AuthService } from '../services/auth';
import { ErrorHandlingService } from '../services/error-handling';
import {
  authMiddleware,
  requireRole,
  AuthenticatedRequest,
} from './auth';

describe('Auth Middleware', () => {
  let authService: AuthService;
  let errorHandlingService: ErrorHandlingService;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    errorHandlingService = new ErrorHandlingService();
    authService = new AuthService(errorHandlingService);
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe('authMiddleware', () => {
    it('should return 401 if no API key is provided', async () => {
      const middleware = authMiddleware(authService);
      await middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Clé API manquante',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if API key is invalid', async () => {
      mockRequest.headers = {
        'x-api-key': 'invalid-key',
      };

      const middleware = authMiddleware(authService);
      await middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Clé API invalide',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should set user and call next with valid API key', async () => {
      const user = await authService.createUser('test@example.com');
      mockRequest.headers = {
        'x-api-key': user.apiKey,
      };

      const middleware = authMiddleware(authService);
      await middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe(user.id);
      expect(mockRequest.user?.email).toBe(user.email);
      expect(mockRequest.user?.role).toBe(user.role);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should return 401 if user is not authenticated', async () => {
      const middleware = requireRole('admin');
      await middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Non authentifié',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 if user has insufficient permissions', async () => {
      const user = await authService.createUser('test@example.com', 'readonly');
      mockRequest.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      const middleware = requireRole('admin');
      await middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Permission insuffisante',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next if user has sufficient permissions', async () => {
      const user = await authService.createUser('test@example.com', 'admin');
      mockRequest.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      const middleware = requireRole('user');
      await middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });
}); 