import { AccessLogger } from './access-logger';
import { ErrorHandlingService } from './error-handling';
import { User } from './auth';

describe('AccessLogger', () => {
  let accessLogger: AccessLogger;
  let errorHandling: ErrorHandlingService;
  let mockUser: User;

  beforeEach(() => {
    errorHandling = new ErrorHandlingService();
    accessLogger = new AccessLogger({}, errorHandling);
    mockUser = {
      id: '123',
      email: 'test@example.com',
      role: 'user',
      apiKey: 'test-key',
      createdAt: Date.now(),
    };
  });

  describe('logAccess', () => {
    it('devrait journaliser un accès réussi', async () => {
      await accessLogger.logAccess(
        mockUser,
        'login',
        '/api/auth',
        'success'
      );

      const logs = await accessLogger.getLogs({});
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        action: 'login',
        resource: '/api/auth',
        status: 'success',
      });
    });

    it('devrait journaliser un accès échoué avec erreur', async () => {
      const error = 'Invalid credentials';
      await accessLogger.logAccess(
        mockUser,
        'login',
        '/api/auth',
        'failure',
        error
      );

      const logs = await accessLogger.getLogs({});
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        status: 'failure',
        error,
      });
    });

    it('devrait inclure les métadonnées optionnelles', async () => {
      const metadata = { browser: 'Chrome', version: '91.0' };
      await accessLogger.logAccess(
        mockUser,
        'login',
        '/api/auth',
        'success',
        undefined,
        metadata
      );

      const logs = await accessLogger.getLogs({});
      expect(logs[0].metadata).toEqual(metadata);
    });
  });

  describe('getLogs', () => {
    beforeEach(async () => {
      await accessLogger.logAccess(mockUser, 'action1', 'resource1', 'success');
      await accessLogger.logAccess(mockUser, 'action2', 'resource2', 'failure');
    });

    it('devrait filtrer par userId', async () => {
      const logs = await accessLogger.getLogs({ userId: mockUser.id });
      expect(logs).toHaveLength(2);
    });

    it('devrait filtrer par action', async () => {
      const logs = await accessLogger.getLogs({ action: 'action1' });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('action1');
    });

    it('devrait filtrer par status', async () => {
      const logs = await accessLogger.getLogs({ status: 'failure' });
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('failure');
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await accessLogger.logAccess(mockUser, 'action1', 'resource1', 'success');
      await accessLogger.logAccess(mockUser, 'action2', 'resource2', 'failure');
    });

    it('devrait retourner les statistiques correctes', async () => {
      const stats = await accessLogger.getStats();
      expect(stats).toEqual({
        totalLogs: 2,
        successCount: 1,
        failureCount: 1,
        byRole: { user: 2 },
        byAction: { action1: 1, action2: 1 },
        byResource: { resource1: 1, resource2: 1 },
      });
    });
  });

  describe('cleanup', () => {
    it('devrait supprimer les entrées expirées', async () => {
      const oldTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000; // 31 jours
      const oldUser = { ...mockUser, createdAt: oldTimestamp };

      await accessLogger.logAccess(oldUser, 'old-action', 'old-resource', 'success');
      await accessLogger.logAccess(mockUser, 'new-action', 'new-resource', 'success');

      const logs = await accessLogger.getLogs({});
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('new-action');
    });

    it('devrait respecter la limite maximale d\'entrées', async () => {
      const config = { maxEntries: 2 };
      const logger = new AccessLogger(config, errorHandling);

      await logger.logAccess(mockUser, 'action1', 'resource1', 'success');
      await logger.logAccess(mockUser, 'action2', 'resource2', 'success');
      await logger.logAccess(mockUser, 'action3', 'resource3', 'success');

      const logs = await logger.getLogs({});
      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBe('action2');
      expect(logs[1].action).toBe('action3');
    });
  });

  describe('exportLogs', () => {
    beforeEach(async () => {
      await accessLogger.logAccess(mockUser, 'action1', 'resource1', 'success');
    });

    it('devrait exporter en JSON', async () => {
      const json = await accessLogger.exportLogs('json');
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].action).toBe('action1');
    });

    it('devrait exporter en CSV', async () => {
      const csv = await accessLogger.exportLogs('csv');
      const lines = csv.split('\n');
      expect(lines).toHaveLength(2); // Headers + 1 entry
      expect(lines[0]).toContain('userId,email,role,action');
      expect(lines[1]).toContain('action1');
    });
  });
}); 