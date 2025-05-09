export interface UserProfile {
  id: string;
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
  preferredLanguage: string;
  learningStyle: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
  interests: string[];
  previousInteractions: Interaction[];
}

export interface Interaction {
  id: string;
  timestamp: Date;
  query: string;
  response: string;
  feedback?: UserFeedback;
}

export interface UserFeedback {
  rating: number;
  comments?: string;
  helpfulness: number;
  clarity: number;
  relevance: number;
}

export interface OptimizedResponse {
  originalResponse: string;
  optimizedResponse: string;
  seoScore: number;
  clarityScore: number;
  structure: ResponseStructure;
  metadata: ResponseMetadata;
}

export interface ResponseStructure {
  sections: Section[];
  summary: string;
  keyPoints: string[];
  actionItems?: string[];
}

export interface Section {
  title: string;
  content: string;
  importance: number;
  type: 'explanation' | 'example' | 'definition' | 'procedure';
}

export interface ResponseMetadata {
  readingTime: number;
  complexity: 'basic' | 'intermediate' | 'advanced';
  topics: string[];
  references?: string[];
  lastUpdated: Date;
} 