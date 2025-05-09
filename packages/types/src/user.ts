import { z } from 'zod';
import { UserRoleSchema } from './auth';

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url().optional(),
  preferences: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('fr'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
  }).default({}),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>; 