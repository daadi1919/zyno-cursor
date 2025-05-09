export interface SemanticNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}

export interface SemanticEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

export interface SemanticGraph {
  nodes: SemanticNode[];
  edges: SemanticEdge[];
}

export interface QueryIntent {
  type: string;
  confidence: number;
  entities: string[];
  context: Record<string, any>;
}

export interface QueryFeedback {
  queryId: string;
  userId: string;
  rating: number;
  comments?: string;
  timestamp: Date;
}

// Types d'utilisateur
export type UserRole = 'admin' | 'user' | 'readonly';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  apiKey: string;
  createdAt: Date;
  updatedAt: Date;
}

// Configuration de l'authentification
export interface AuthConfig {
  cacheSize: number;
  cacheTTL: number;
}

// Configuration de la gestion des erreurs
export interface ErrorConfig {
  logErrors: boolean;
  notifyOnError: boolean;
}

// Configuration OAuth
export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string[];
}

// Types OAuth
export interface OAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

// Types de cache
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

// Types de journalisation
export interface AccessLog {
  userId: string;
  action: string;
  resource: string;
  status: 'success' | 'failure';
  error?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
} 