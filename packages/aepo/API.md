# Guide d'API AEPO

## Table des Matières

1. [Authentification](#authentification)
2. [Gestion des Utilisateurs](#gestion-des-utilisateurs)
3. [Cache](#cache)
4. [Gestion des Erreurs](#gestion-des-erreurs)
5. [Types et Interfaces](#types-et-interfaces)

## Authentification

### Middleware d'Authentification

```typescript
import { authMiddleware } from '@zyno/aepo';

// Appliquer à toutes les routes
app.use(authMiddleware(authService));

// Appliquer à des routes spécifiques
app.use('/api', authMiddleware(authService));
```

Le middleware vérifie la présence et la validité de la clé API dans l'en-tête `x-api-key`.

### Middleware de Rôle

```typescript
import { requireRole, requireAdmin, requireUser, requireReadonly } from '@zyno/aepo';

// Rôle personnalisé
app.get('/custom', requireRole('custom-role'), handler);

// Rôles prédéfinis
app.get('/admin', requireAdmin, handler);
app.get('/user', requireUser, handler);
app.get('/readonly', requireReadonly, handler);
```

## Gestion des Utilisateurs

### Création d'Utilisateur

```typescript
const user = await authService.createUser(
  'user@example.com',
  'user' // rôle optionnel, 'user' par défaut
);
```

Retourne un objet `User` avec :
- `id`: Identifiant unique
- `email`: Adresse email
- `role`: Rôle de l'utilisateur
- `apiKey`: Clé API générée
- `createdAt`: Timestamp de création
- `lastLogin`: Timestamp de dernière connexion (optionnel)

### Validation de Clé API

```typescript
const user = await authService.validateApiKey(apiKey);
```

Retourne :
- L'objet `User` si la clé est valide
- `null` si la clé est invalide

### Mise à Jour de Rôle

```typescript
const updatedUser = await authService.updateUserRole(
  userId,
  'admin' // nouveau rôle
);
```

Retourne l'objet `User` mis à jour.

### Rotation de Clé API

```typescript
const newApiKey = await authService.rotateApiKey(userId);
```

Retourne la nouvelle clé API.

### Suppression d'Utilisateur

```typescript
await authService.deleteUser(userId);
```

### Recherche d'Utilisateur

```typescript
// Par ID
const user = authService.getUserById(userId);

// Par email
const user = authService.getUserByEmail(email);

// Tous les utilisateurs
const users = authService.getAllUsers();
```

## Cache

### Statistiques

```typescript
const stats = authService.getCacheStats();
```

Retourne un objet avec :
- `size`: Nombre d'entrées dans le cache
- `hitCount`: Nombre de succès
- `missCount`: Nombre d'échecs
- `hitRate`: Taux de réussite (0-1)

### Gestion du Cache

```typescript
// Nettoyer les entrées expirées
authService.cleanupCache();

// Vider le cache
authService.clearCache();
```

## Gestion des Erreurs

### Configuration

```typescript
const errorHandling = new ErrorHandlingService({
  maxAttempts: 3,        // Nombre maximum de tentatives
  initialDelay: 1000,    // Délai initial en ms
  maxDelay: 10000,       // Délai maximum en ms
  backoffFactor: 2,      // Facteur d'augmentation du délai
});
```

### Utilisation

```typescript
// Avec retry
const result = await errorHandling.withRetry(
  () => operation(),
  'operation-name'
);

// Avec timeout
const result = await errorHandling.withTimeout(
  () => operation(),
  5000 // timeout en ms
);

// Avec fallback
const result = await errorHandling.withFallback(
  () => primaryOperation(),
  () => fallbackOperation()
);
```

## Types et Interfaces

### User

```typescript
interface User {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'readonly';
  apiKey: string;
  createdAt: number;
  lastLogin?: number;
}
```

### AuthConfig

```typescript
interface AuthConfig {
  jwtSecret: string;
  tokenExpiration: number;
  apiKeyLength: number;
  cacheSize: number;
  cacheTTL: number;
}
```

### RetryConfig

```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}
```

### FallbackConfig

```typescript
interface FallbackConfig {
  enabled: boolean;
  defaultResponse: any;
  timeout: number;
}
```

## Codes d'Erreur

- `401`: Non authentifié
  - Clé API manquante
  - Clé API invalide
- `403`: Permission insuffisante
  - Rôle insuffisant
  - Accès refusé
- `404`: Ressource non trouvée
  - Utilisateur non trouvé
- `500`: Erreur serveur
  - Erreur d'authentification
  - Erreur de cache
  - Erreur de base de données 