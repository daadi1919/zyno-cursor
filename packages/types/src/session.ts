import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.date(),
  createdAt: z.date(),
  lastActivity: z.date(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Session = z.infer<typeof SessionSchema>;

export const SessionConfigSchema = z.object({
  sessionTTL: z.number().min(300).max(604800), // 5 minutes to 7 days
  maxSessionsPerUser: z.number().min(1).max(10),
});

export type SessionConfig = z.infer<typeof SessionConfigSchema>; 