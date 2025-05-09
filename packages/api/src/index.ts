import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { AEPOEngine } from '@zyno/aepo';
import { AECOEngine } from '@zyno/aeco';
import { RAGEngine } from '@zyno/rag';
import { registerRoutes } from './routes';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST || 'localhost';

async function start() {
  // Initialisation des moteurs
  const aepo = new AEPOEngine(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  );

  const aeco = new AECOEngine(
    process.env.CHROMA_URI || 'http://localhost:8000'
  );

  const rag = new RAGEngine({
    modelPath: process.env.LLAMA_MODEL_PATH || './models/llama-2-7b-chat.gguf',
    contextWindow: 4096,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxTokens: 2048,
    chromaUri: process.env.CHROMA_URI || 'http://localhost:8000'
  });

  // Initialisation de Fastify
  const fastify = Fastify({
    logger: true
  });

  // Configuration CORS
  await fastify.register(cors, {
    origin: true
  });

  // Configuration Swagger
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'Zyno API',
        description: 'API de la plateforme conversationnelle Zyno',
        version: '0.1.0'
      }
    }
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation'
  });

  // Enregistrement des routes
  await registerRoutes(fastify, aepo, aeco, rag);

  // Démarrage du serveur
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Serveur démarré sur http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start(); 