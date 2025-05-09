import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'user', 'readonly']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  apiKey: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const AuthConfigSchema = z.object({
  apiKeyLength: z.number().min(16).max(64),
  passwordHashRounds: z.number().min(10).max(14),
  cacheSize: z.number().min(100).max(10000),
  cacheTTL: z.number().min(300).max(86400),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>; 