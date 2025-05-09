import { z } from 'zod';
import { ErrorHandlingService } from './error-handling';
import { User } from './auth';

// Schéma de validation pour les entrées de journal
const AccessLogEntrySchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'readonly']),
  action: z.string(),
  resource: z.string(),
  timestamp: z.number(),
  ip: z.string().ip().optional(),
  userAgent: z.string().optional(),
  status: z.enum(['success', 'failure']),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

type AccessLogEntry = z.infer<typeof AccessLogEntrySchema>;

interface AccessLoggerConfig {
  maxEntries: number;
  retentionPeriod: number;
  enableIPLogging: boolean;
  enableUserAgentLogging: boolean;
  errorHandling: ErrorHandlingService;
}

export class AccessLogger {
  private logs: AccessLogEntry[] = [];
  private readonly config: AccessLoggerConfig;
  private readonly errorHandling: ErrorHandlingService;

  constructor(config: Partial<AccessLoggerConfig>, errorHandling: ErrorHandlingService) {
    this.errorHandling = errorHandling;
    this.config = {
      maxEntries: config.maxEntries ?? 10000,
      retentionPeriod: config.retentionPeriod ?? 30 * 24 * 60 * 60 * 1000, // 30 jours par défaut
      enableIPLogging: config.enableIPLogging ?? true,
      enableUserAgentLogging: config.enableUserAgentLogging ?? true,
      errorHandling,
    };
  }

  async logAccess(
    user: User,
    action: string,
    resource: string,
    status: 'success' | 'failure',
    error?: string,
    metadata?: Record<string, unknown>,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const entry: AccessLogEntry = {
      userId: user.id,
      email: user.email,
      role: user.role,
      action,
      resource,
      timestamp: Date.now(),
      status,
      error,
      metadata,
      ...(this.config.enableIPLogging && ip ? { ip } : {}),
      ...(this.config.enableUserAgentLogging && userAgent ? { userAgent } : {}),
    };

    try {
      await this.errorHandling.withRetry(
        () => {
          this.logs.push(entry);
          this.cleanup();
        },
        'access-logger-log'
      );
    } catch (error) {
      console.error('Erreur lors de la journalisation:', error);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    this.logs = this.logs.filter(
      (log) => now - log.timestamp < this.config.retentionPeriod
    );

    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries);
    }
  }

  async getLogs(options: {
    userId?: string;
    role?: string;
    action?: string;
    resource?: string;
    status?: 'success' | 'failure';
    startTime?: number;
    endTime?: number;
  }): Promise<AccessLogEntry[]> {
    return this.errorHandling.withRetry(
      () => {
        return this.logs.filter((log) => {
          if (options.userId && log.userId !== options.userId) return false;
          if (options.role && log.role !== options.role) return false;
          if (options.action && log.action !== options.action) return false;
          if (options.resource && log.resource !== options.resource) return false;
          if (options.status && log.status !== options.status) return false;
          if (options.startTime && log.timestamp < options.startTime) return false;
          if (options.endTime && log.timestamp > options.endTime) return false;
          return true;
        });
      },
      'access-logger-get-logs'
    );
  }

  async getStats(): Promise<{
    totalLogs: number;
    successCount: number;
    failureCount: number;
    byRole: Record<string, number>;
    byAction: Record<string, number>;
    byResource: Record<string, number>;
  }> {
    return this.errorHandling.withRetry(
      () => {
        const stats = {
          totalLogs: this.logs.length,
          successCount: 0,
          failureCount: 0,
          byRole: {} as Record<string, number>,
          byAction: {} as Record<string, number>,
          byResource: {} as Record<string, number>,
        };

        for (const log of this.logs) {
          if (log.status === 'success') {
            stats.successCount++;
          } else {
            stats.failureCount++;
          }

          stats.byRole[log.role] = (stats.byRole[log.role] || 0) + 1;
          stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
          stats.byResource[log.resource] = (stats.byResource[log.resource] || 0) + 1;
        }

        return stats;
      },
      'access-logger-get-stats'
    );
  }

  async clearLogs(): Promise<void> {
    await this.errorHandling.withRetry(
      () => {
        this.logs = [];
      },
      'access-logger-clear-logs'
    );
  }

  async exportLogs(format: 'json' | 'csv'): Promise<string> {
    return this.errorHandling.withRetry(
      () => {
        if (format === 'json') {
          return JSON.stringify(this.logs, null, 2);
        } else {
          const headers = Object.keys(this.logs[0] || {}).join(',');
          const rows = this.logs.map((log) => Object.values(log).join(','));
          return [headers, ...rows].join('\n');
        }
      },
      'access-logger-export-logs'
    );
  }
} 