import express from 'express';
import session from 'express-session';
import { OAuthService } from '../src/services/oauth';
import { AuthService } from '../src/services/auth';
import { AccessLogger } from '../src/services/access-logger';
import { oauthMiddleware } from '../src/middleware/oauth';

const app = express();

// Configuration de la session
app.use(
  session({
    secret: 'votre-secret-session',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 heures
    },
  })
);

// Initialisation des services
const oauthService = new OAuthService();
const authService = new AuthService();
const accessLogger = new AccessLogger();

// Configuration des fournisseurs OAuth
oauthService.registerProvider('google', {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: 'http://localhost:3000/auth/google/callback',
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
  scope: ['email', 'profile'],
});

oauthService.registerProvider('github', {
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  redirectUri: 'http://localhost:3000/auth/github/callback',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userInfoUrl: 'https://api.github.com/user',
  scope: ['user:email'],
});

// Initialisation du middleware OAuth
const oauth = oauthMiddleware(oauthService, authService, accessLogger);

// Routes OAuth
app.get('/auth/providers', oauth.getProviders());

// Route pour initier l'authentification Google
app.get('/auth/google', oauth.initiateAuth('google'));

// Route pour initier l'authentification GitHub
app.get('/auth/github', oauth.initiateAuth('github'));

// Callback pour Google
app.get('/auth/google/callback', oauth.handleCallback('google'));

// Callback pour GitHub
app.get('/auth/github/callback', oauth.handleCallback('github'));

// Route pour rafraîchir les tokens
app.post('/auth/refresh/:provider', (req, res) => {
  const provider = req.params.provider;
  oauth.refreshToken(provider)(req, res);
});

// Route de callback frontend
app.get('/auth/callback', (req, res) => {
  const token = req.query.token;
  if (token) {
    // Rediriger vers le frontend avec le token
    res.redirect(`http://localhost:3000/login?token=${token}`);
  } else {
    res.status(400).json({ error: 'Token manquant' });
  }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
}); 