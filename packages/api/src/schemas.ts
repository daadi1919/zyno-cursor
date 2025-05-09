import { z } from 'zod';

export const QuerySchema = z.object({
  query: z.string().min(1).max(1000),
  context: z.object({
    userId: z.string().uuid(),
    sessionId: z.string().uuid(),
    timestamp: z.string().datetime(),
    previousQueries: z.array(z.string()),
    userPreferences: z.record(z.unknown())
  }).optional()
});

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  metadata: z.object({
    title: z.string(),
    type: z.enum(['pdf', 'docx', 'txt', 'html']),
    source: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    tags: z.array(z.string()),
    language: z.string(),
    pageCount: z.number().optional(),
    wordCount: z.number()
  })
});

export const ResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(DocumentSchema),
  confidence: z.number().min(0).max(1),
  generationTime: z.number(),
  tokensUsed: z.number()
});

export const ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional()
}); 