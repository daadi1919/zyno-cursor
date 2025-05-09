import { LLama } from '@llama-node/llama-cpp';
import { LLamaCpp } from '@llama-node/core';

export class EmbeddingService {
  private llama: LLama;
  private modelPath: string;

  constructor(modelPath: string) {
    this.llama = new LLama(LLamaCpp);
    this.modelPath = modelPath;
  }

  async initialize(): Promise<void> {
    await this.llama.load({
      modelPath: this.modelPath,
      contextSize: 512,
      batchSize: 512,
    });
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    // TODO: Implémenter la génération d'embeddings avec LLaMA
    // Pour l'instant, retournons un vecteur aléatoire pour les tests
    return Array.from({ length: 384 }, () => Math.random());
  }

  async close(): Promise<void> {
    await this.llama.dispose();
  }
} 