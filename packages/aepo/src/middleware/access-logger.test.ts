import { Request, Response } from 'express';
import { AccessLogger } from '../services/access-logger';
import { accessLoggerMiddleware } from './access-logger';
import { AuthenticatedRequest } from './auth';

describe('accessLoggerMiddleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let accessLogger: AccessLogger;
  let logAccessSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
      query: { param: 'value' },
      params: { id: '123' },
    };

    mockResponse = {
      statusCode: 200,
      statusMessage: 'OK',
      end: jest.fn(),
    };

    mockNext = jest.fn();
    accessLogger = new AccessLogger({}, {} as any);
    logAccessSpy = jest.spyOn(accessLogger, 'logAccess');
  });

  it('devrait journaliser une requête réussie', async () => {
    const middleware = accessLoggerMiddleware(accessLogger);
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    // Simuler la fin de la réponse
    await (mockResponse.end as jest.Mock).mock.calls[0][2]();

    expect(logAccessSpy).toHaveBeenCalledWith(
      expect.any(Object),
      'GET',
      '/api/test',
      'success',
      undefined,
      expect.objectContaining({
        statusCode: 200,
        query: { param: 'value' },
        params: { id: '123' },
      }),
      '127.0.0.1',
      'Mozilla/5.0'
    );
  });

  it('devrait journaliser une requête échouée', async () => {
    mockResponse.statusCode = 404;
    mockResponse.statusMessage = 'Not Found';

    const middleware = accessLoggerMiddleware(accessLogger);
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    // Simuler la fin de la réponse
    await (mockResponse.end as jest.Mock).mock.calls[0][2]();

    expect(logAccessSpy).toHaveBeenCalledWith(
      expect.any(Object),
      'GET',
      '/api/test',
      'failure',
      'Not Found',
      expect.objectContaining({
        statusCode: 404,
      }),
      '127.0.0.1',
      'Mozilla/5.0'
    );
  });

  it('ne devrait pas journaliser si l\'utilisateur n\'est pas authentifié', async () => {
    const middleware = accessLoggerMiddleware(accessLogger);
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    // Simuler la fin de la réponse
    await (mockResponse.end as jest.Mock).mock.calls[0][2]();

    expect(logAccessSpy).not.toHaveBeenCalled();
  });

  it('devrait appeler next()', async () => {
    const middleware = accessLoggerMiddleware(accessLogger);
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('devrait restaurer la fonction end originale', async () => {
    const originalEnd = mockResponse.end;
    const middleware = accessLoggerMiddleware(accessLogger);
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    // Simuler la fin de la réponse
    await (mockResponse.end as jest.Mock).mock.calls[0][2]();

    expect(mockResponse.end).toBe(originalEnd);
  });
}); 