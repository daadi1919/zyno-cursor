export interface Document {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embeddings?: number[];
}

export interface DocumentMetadata {
  title: string;
  type: 'pdf' | 'docx' | 'txt' | 'html';
  source: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  language: string;
  pageCount?: number;
  wordCount: number;
}

export interface QueryResult {
  documents: Document[];
  scores: number[];
  totalResults: number;
  queryTime: number;
}

export interface RAGConfig {
  modelPath: string;
  contextWindow: number;
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  chromaUri: string;
}

export interface GenerationOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface RAGResponse {
  answer: string;
  sources: Document[];
  confidence: number;
  generationTime: number;
  tokensUsed: number;
} 