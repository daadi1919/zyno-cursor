import { LLama } from '@llama-node/llama-cpp';
import { LLamaCpp } from '@llama-node/core';
import { ChromaClient } from 'chromadb';
import { Document, RAGConfig, RAGResponse, QueryResult, GenerationOptions } from './types';
import { DocumentProcessor } from './document-processor';
import { EmbeddingService } from './embedding-service';

export class RAGEngine {
  private llama: LLama;
  private chromaClient: ChromaClient;
  private documentProcessor: DocumentProcessor;
  private embeddingService: EmbeddingService;
  private config: RAGConfig;

  constructor(config: RAGConfig) {
    this.config = config;
    this.llama = new LLama(LLamaCpp);
    this.chromaClient = new ChromaClient(config.chromaUri);
    this.documentProcessor = new DocumentProcessor();
    this.embeddingService = new EmbeddingService();
  }

  async initialize(): Promise<void> {
    await this.llama.load({
      modelPath: this.config.modelPath,
      contextSize: this.config.contextWindow,
      batchSize: 512,
    });
  }

  async addDocument(document: Document): Promise<void> {
    // Traitement du document
    const processedContent = await this.documentProcessor.process(document);
    
    // Génération des embeddings
    const embeddings = await this.embeddingService.generateEmbeddings(processedContent);
    
    // Stockage dans Chroma
    await this.chromaClient.add({
      ids: [document.id],
      embeddings: [embeddings],
      metadatas: [document.metadata],
      documents: [processedContent],
    });
  }

  async query(
    query: string,
    options: GenerationOptions = {}
  ): Promise<RAGResponse> {
    const startTime = Date.now();

    // Recherche de documents pertinents
    const queryResult = await this.searchDocuments(query);

    // Construction du prompt avec le contexte
    const prompt = this.buildPrompt(query, queryResult);

    // Génération de la réponse avec LLaMA
    const response = await this.llama.createCompletion({
      prompt,
      temperature: options.temperature ?? this.config.temperature,
      topP: options.topP ?? this.config.topP,
      topK: options.topK ?? this.config.topK,
      maxTokens: options.maxTokens ?? this.config.maxTokens,
      stop: options.stopSequences,
    });

    const generationTime = Date.now() - startTime;

    return {
      answer: response.text,
      sources: queryResult.documents,
      confidence: this.calculateConfidence(response, queryResult),
      generationTime,
      tokensUsed: response.tokensUsed,
    };
  }

  private async searchDocuments(query: string): Promise<QueryResult> {
    const queryEmbedding = await this.embeddingService.generateEmbeddings(query);
    
    const results = await this.chromaClient.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 5,
    });

    return {
      documents: results.documents[0].map((doc, i) => ({
        id: results.ids[0][i],
        content: doc,
        metadata: results.metadatas[0][i],
      })),
      scores: results.distances[0],
      totalResults: results.documents[0].length,
      queryTime: 0, // TODO: Implémenter le calcul du temps
    };
  }

  private buildPrompt(query: string, queryResult: QueryResult): string {
    const context = queryResult.documents
      .map((doc) => `Source: ${doc.metadata.title}\n${doc.content}`)
      .join('\n\n');

    return `Context information is below.
---------------------
${context}
---------------------
Given the context information, please answer the following question:
${query}

Answer:`;
  }

  private calculateConfidence(response: any, queryResult: QueryResult): number {
    // TODO: Implémenter un calcul de confiance plus sophistiqué
    return 0.8;
  }

  async close(): Promise<void> {
    await this.llama.dispose();
  }
}

export * from './types'; 