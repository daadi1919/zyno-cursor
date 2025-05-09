import { z } from 'zod';

export const ErrorCodeSchema = z.enum([
  'AUTH_ERROR',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'FORBIDDEN',
  'RATE_LIMIT_EXCEEDED',
  'INTERNAL_ERROR',
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  timestamp: z.date(),
});

export type Error = z.infer<typeof ErrorSchema>;

export const ErrorConfigSchema = z.object({
  maxRetries: z.number().min(1).max(5),
  retryDelay: z.number().min(100).max(5000),
  logErrors: z.boolean(),
});

export type ErrorConfig = z.infer<typeof ErrorConfigSchema>; 