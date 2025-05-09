# AEPO - Service d'Authentification et d'Optimisation

## Description

AEPO est un service d'authentification et d'optimisation de requêtes qui offre :
- Une gestion sécurisée des utilisateurs et des clés API
- Un système de cache performant
- Une gestion des erreurs robuste
- Des middlewares d'authentification et d'autorisation

## Fonctionnalités

- Gestion sécurisée des utilisateurs
- Système de cache performant
- Gestion robuste des erreurs
- Middlewares d'authentification et d'autorisation
- Support de l'authentification OAuth (Google, GitHub)

## Installation

```bash
npm install @zyno/aepo
```

## Configuration

### Service d'Authentification

```typescript
import { AuthService } from '@zyno/aepo';

const authService = new AuthService({
  cacheSize: 1000,
  cacheTTL: 3600, // 1 heure
});
```

### Service de Gestion des Erreurs

```typescript
import { ErrorHandlingService } from '@zyno/aepo';

const errorService = new ErrorHandlingService({
  logErrors: true,
  notifyOnError: true,
});
```

### Service OAuth

```typescript
import { OAuthService } from '@zyno/aepo';

const oauthService = new OAuthService();

// Configuration de Google OAuth
oauthService.registerProvider('google', {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: 'http://localhost:3000/auth/google/callback',
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
  scope: ['email', 'profile'],
});

// Configuration de GitHub OAuth
oauthService.registerProvider('github', {
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  redirectUri: 'http://localhost:3000/auth/github/callback',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userInfoUrl: 'https://api.github.com/user',
  scope: ['user:email'],
});
```

## Identifiants de Test

### Administrateur
```json
{
  "email": "admin@zyno.com",
  "apiKey": "zyno_admin_2024_secure_key_123",
  "role": "admin"
}
```

### Utilisateur Standard
```json
{
  "email": "user@zyno.com",
  "apiKey": "zyno_user_2024_secure_key_456",
  "role": "user"
}
```

### Utilisateur en Lecture Seule
```json
{
  "email": "readonly@zyno.com",
  "apiKey": "zyno_readonly_2024_secure_key_789",
  "role": "readonly"
}
```

Pour utiliser ces identifiants, ajoutez l'en-tête `x-api-key` à vos requêtes :
```bash
curl -H "x-api-key: zyno_admin_2024_secure_key_123" https://api.zyno.com/endpoint
```

## Utilisation

### Gestion des Utilisateurs

```typescript
// Créer un utilisateur
const user = await authService.createUser('user@example.com', 'user');

// Valider une clé API
const isValid = await authService.validateApiKey('api-key');

// Mettre à jour le rôle d'un utilisateur
await authService.updateUserRole('user-id', 'admin');

// Rotation de la clé API
const newKey = await authService.rotateApiKey('user-id');

// Supprimer un utilisateur
await authService.deleteUser('user-id');
```

### Middleware d'Authentification

```typescript
import { authMiddleware } from '@zyno/aepo';

app.use(authMiddleware(authService));
```

### Middleware OAuth

```typescript
import { oauthMiddleware } from '@zyno/aepo';

const oauth = oauthMiddleware(oauthService, authService, accessLogger);

// Routes OAuth
app.get('/auth/providers', oauth.getProviders());
app.get('/auth/google', oauth.initiateAuth('google'));
app.get('/auth/github', oauth.initiateAuth('github'));
app.get('/auth/google/callback', oauth.handleCallback('google'));
app.get('/auth/github/callback', oauth.handleCallback('github'));
app.post('/auth/refresh/:provider', (req, res) => {
  const provider = req.params.provider;
  oauth.refreshToken(provider)(req, res);
});
```

### Gestion du Cache

```typescript
// Obtenir les statistiques du cache
const stats = await authService.getCacheStats();

// Vider le cache
await authService.clearCache();

// Nettoyer le cache
await authService.cleanupCache();
```

### Gestion des Erreurs

```typescript
try {
  // Votre code
} catch (error) {
  errorService.handleError(error);
}
```

## Types et Interfaces

```typescript
interface User {
  id: string;
  email: string;
  role: UserRole;
  apiKey: string;
  createdAt: Date;
  updatedAt: Date;
}

type UserRole = 'admin' | 'user' | 'readonly';

interface AuthConfig {
  cacheSize: number;
  cacheTTL: number;
}

interface ErrorConfig {
  logErrors: boolean;
  notifyOnError: boolean;
}
```

## Sécurité

- Génération sécurisée des clés API
- Hachage des mots de passe
- Validation des entrées avec Zod
- Protection CSRF pour OAuth
- Gestion sécurisée des sessions

## Performance

- Cache LRU pour les utilisateurs
- Nettoyage automatique des entrées expirées
- Statistiques de performance du cache

## Tests

```bash
npm test
```

## Contribution

Les contributions sont les bienvenues ! Veuillez consulter notre guide de contribution pour plus de détails.

## Licence

MIT 