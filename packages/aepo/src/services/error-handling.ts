import { Alert } from './monitoring';

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export interface FallbackConfig {
  enabled: boolean;
  defaultResponse: any;
  timeout: number;
}

export class ErrorHandlingService {
  private retryConfig: RetryConfig;
  private fallbackConfig: FallbackConfig;
  private errorCounts: Map<string, number>;
  private lastErrorTimes: Map<string, number>;

  constructor(
    retryConfig: Partial<RetryConfig> = {},
    fallbackConfig: Partial<FallbackConfig> = {}
  ) {
    this.retryConfig = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      ...retryConfig,
    };

    this.fallbackConfig = {
      enabled: true,
      defaultResponse: null,
      timeout: 5000,
      ...fallbackConfig,
    };

    this.errorCounts = new Map();
    this.lastErrorTimes = new Map();
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    let attempt = 0;
    let delay = this.retryConfig.initialDelay;

    while (attempt < this.retryConfig.maxAttempts) {
      try {
        const result = await operation();
        this.resetErrorCount(operationName);
        return result;
      } catch (error) {
        lastError = error as Error;
        attempt++;
        this.incrementErrorCount(operationName);

        if (attempt === this.retryConfig.maxAttempts) {
          break;
        }

        await this.delay(delay);
        delay = Math.min(
          delay * this.retryConfig.backoffFactor,
          this.retryConfig.maxDelay
        );
      }
    }

    if (this.fallbackConfig.enabled) {
      return this.getFallbackResponse(operationName);
    }

    throw new Error(
      `Échec après ${attempt} tentatives pour ${operationName}: ${lastError?.message}`
    );
  }

  async withTimeout<T>(
    operation: () => Promise<T>,
    timeout: number = this.fallbackConfig.timeout
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Opération expirée après ${timeout}ms`));
      }, timeout);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  async withFallback<T>(
    operation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.warn('Utilisation du fallback:', error);
      return fallbackOperation();
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private incrementErrorCount(operationName: string): void {
    const currentCount = this.errorCounts.get(operationName) || 0;
    this.errorCounts.set(operationName, currentCount + 1);
    this.lastErrorTimes.set(operationName, Date.now());
  }

  private resetErrorCount(operationName: string): void {
    this.errorCounts.set(operationName, 0);
  }

  private getFallbackResponse(operationName: string): any {
    console.warn(`Utilisation de la réponse par défaut pour ${operationName}`);
    return this.fallbackConfig.defaultResponse;
  }

  getErrorStats(): {
    operationName: string;
    errorCount: number;
    lastErrorTime: number | null;
  }[] {
    return Array.from(this.errorCounts.entries()).map(([name, count]) => ({
      operationName: name,
      errorCount: count,
      lastErrorTime: this.lastErrorTimes.get(name) || null,
    }));
  }

  clearErrorStats(): void {
    this.errorCounts.clear();
    this.lastErrorTimes.clear();
  }

  updateConfig(
    retryConfig?: Partial<RetryConfig>,
    fallbackConfig?: Partial<FallbackConfig>
  ): void {
    if (retryConfig) {
      this.retryConfig = { ...this.retryConfig, ...retryConfig };
    }
    if (fallbackConfig) {
      this.fallbackConfig = { ...this.fallbackConfig, ...fallbackConfig };
    }
  }
} 