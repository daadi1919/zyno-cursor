import { FastifyInstance } from 'fastify';
import { AEPOEngine } from '@zyno/aepo';
import { AECOEngine } from '@zyno/aeco';
import { RAGEngine } from '@zyno/rag';
import { QuerySchema, ResponseSchema, DocumentSchema } from './schemas';

export async function registerRoutes(
  fastify: FastifyInstance,
  aepo: AEPOEngine,
  aeco: AECOEngine,
  rag: RAGEngine
) {
  // Route de santé
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });

  // Route de requête
  fastify.post('/query', {
    schema: {
      body: QuerySchema,
      response: {
        200: ResponseSchema
      }
    }
  }, async (request, reply) => {
    const { query, context } = request.body;

    try {
      // Optimisation de la requête avec AEPO
      const optimizedQuery = await aepo.optimizeQuery(query, context);

      // Génération de la réponse avec RAG
      const ragResponse = await rag.query(optimizedQuery.optimizedQuery);

      // Optimisation de la réponse avec AECO
      const optimizedResponse = await aeco.optimizeResponse(
        ragResponse.answer,
        context?.userPreferences
      );

      return {
        answer: optimizedResponse.optimizedResponse,
        sources: ragResponse.sources,
        confidence: optimizedResponse.clarityScore,
        generationTime: ragResponse.generationTime,
        tokensUsed: ragResponse.tokensUsed
      };
    } catch (error) {
      fastify.log.error(error);
      throw error;
    }
  });

  // Route d'ajout de document
  fastify.post('/documents', {
    schema: {
      body: DocumentSchema
    }
  }, async (request, reply) => {
    const document = request.body;

    try {
      await rag.addDocument(document);
      return { status: 'success' };
    } catch (error) {
      fastify.log.error(error);
      throw error;
    }
  });

  // Route de feedback
  fastify.post('/feedback', {
    schema: {
      body: {
        queryId: { type: 'string' },
        rating: { type: 'number', minimum: 1, maximum: 5 },
        comments: { type: 'string' }
      }
    }
  }, async (request, reply) => {
    const { queryId, rating, comments } = request.body;

    try {
      // TODO: Implémenter le traitement du feedback
      return { status: 'success' };
    } catch (error) {
      fastify.log.error(error);
      throw error;
    }
  });
} 