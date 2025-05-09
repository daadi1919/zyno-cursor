import { AuthConfig, ErrorConfig } from '../src/types';

// Configuration du serveur
export const serverConfig = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Configuration de la session
export const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'votre-secret-session',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 heures
  },
};

// Configuration de l'authentification
export const authConfig: AuthConfig = {
  cacheSize: parseInt(process.env.CACHE_SIZE || '1000', 10),
  cacheTTL: parseInt(process.env.CACHE_TTL || '3600', 10),
};

// Configuration de la gestion des erreurs
export const errorConfig: ErrorConfig = {
  logErrors: process.env.LOG_ERRORS === 'true',
  notifyOnError: process.env.NOTIFY_ON_ERROR === 'true',
};

// Configuration Google OAuth
export const googleOAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: 'http://localhost:3000/auth/google/callback',
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
  scope: ['email', 'profile'],
};

// Configuration GitHub OAuth
export const githubOAuthConfig = {
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  redirectUri: 'http://localhost:3000/auth/github/callback',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userInfoUrl: 'https://api.github.com/user',
  scope: ['user:email'],
}; 