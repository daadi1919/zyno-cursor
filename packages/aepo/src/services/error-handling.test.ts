import { ErrorHandlingService } from './error-handling';

describe('ErrorHandlingService', () => {
  let errorHandlingService: ErrorHandlingService;

  beforeEach(() => {
    errorHandlingService = new ErrorHandlingService();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await errorHandlingService.withRetry(operation, 'test');
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('success');

      const result = await errorHandlingService.withRetry(operation, 'test');
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use fallback after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
      const fallbackService = new ErrorHandlingService(
        { maxAttempts: 2 },
        { enabled: true, defaultResponse: 'fallback' }
      );

      const result = await fallbackService.withRetry(operation, 'test');
      expect(result).toBe('fallback');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('withTimeout', () => {
    it('should return result before timeout', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await errorHandlingService.withTimeout(operation, 1000);
      expect(result).toBe('success');
    });

    it('should throw error on timeout', async () => {
      const operation = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      await expect(
        errorHandlingService.withTimeout(operation, 50)
      ).rejects.toThrow('Opération expirée');
    });
  });

  describe('withFallback', () => {
    it('should use primary operation when successful', async () => {
      const primary = jest.fn().mockResolvedValue('primary');
      const fallback = jest.fn().mockResolvedValue('fallback');

      const result = await errorHandlingService.withFallback(primary, fallback);
      expect(result).toBe('primary');
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should use fallback when primary fails', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('Primary failed'));
      const fallback = jest.fn().mockResolvedValue('fallback');

      const result = await errorHandlingService.withFallback(primary, fallback);
      expect(result).toBe('fallback');
    });
  });

  describe('error tracking', () => {
    it('should track error counts', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('success');

      await errorHandlingService.withRetry(operation, 'test');
      const stats = errorHandlingService.getErrorStats();
      expect(stats).toHaveLength(1);
      expect(stats[0].errorCount).toBe(2);
    });

    it('should clear error stats', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failure'));
      await errorHandlingService.withRetry(operation, 'test');
      errorHandlingService.clearErrorStats();
      expect(errorHandlingService.getErrorStats()).toHaveLength(0);
    });
  });

  describe('config updates', () => {
    it('should update retry config', () => {
      const newConfig = {
        maxAttempts: 5,
        initialDelay: 2000,
      };
      errorHandlingService.updateConfig(newConfig);
      expect(errorHandlingService['retryConfig'].maxAttempts).toBe(5);
      expect(errorHandlingService['retryConfig'].initialDelay).toBe(2000);
    });

    it('should update fallback config', () => {
      const newConfig = {
        enabled: false,
        timeout: 10000,
      };
      errorHandlingService.updateConfig(undefined, newConfig);
      expect(errorHandlingService['fallbackConfig'].enabled).toBe(false);
      expect(errorHandlingService['fallbackConfig'].timeout).toBe(10000);
    });
  });
}); 