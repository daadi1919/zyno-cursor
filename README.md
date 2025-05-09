# Zyno - Plateforme Conversationnelle Intelligente

Zyno est une plateforme conversationnelle intelligente basée sur ElizaOS, intégrant un système RAG (Retrieval-Augmented Generation) avec LLaMA et deux moteurs d'optimisation : AEPO et AECO.

## 🚀 Fonctionnalités Principales

- **AEPO (Ask Engine Prompt Optimization)**
  - Optimisation des requêtes utilisateurs
  - Détection d'intention et clarification contextuelle
  - Mapping sémantique via graphes
  - Apprentissage par renforcement

- **AECO (Answer Engine Clarity Optimization)**
  - Génération de réponses claires et structurées
  - Analyse SEO avancée
  - Adaptation personnalisée aux utilisateurs
  - Évaluation continue

- **RAG Engine**
  - LLM LLaMA 3
  - Système de récupération documentaire
  - Base vectorielle
  - Interface conversationnelle

## 🛠️ Stack Technique

- Node.js 23.3.0
- TypeScript
- pnpm workspaces
- React/Next.js
- LLaMA 3
- Base vectorielle (Chroma/Qdrant/Weaviate)
- Neo4j
- Docker (optionnel)

## 📦 Installation sur Debian 12

### Prérequis système

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation des dépendances système
sudo apt install -y \
    curl \
    git \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    redis-server \
    postgresql \
    postgresql-contrib \
    libpq-dev \
    libssl-dev \
    pkg-config \
    cmake \
    gcc \
    g++ \
    make \
    wget \
    unzip

# Installation de Node.js 23.3.0
curl -fsSL https://deb.nodesource.com/setup_23.x | sudo -E bash -
sudo apt install -y nodejs

# Installation de pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc

# Installation de Docker (optionnel)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Installation de Neo4j
wget -O - https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
echo 'deb https://debian.neo4j.com stable latest' | sudo tee /etc/apt/sources.list.d/neo4j.list
sudo apt update
sudo apt install neo4j

# Installation de Python packages
pip3 install --user virtualenv
pip3 install --user numpy pandas scikit-learn torch transformers

# Configuration de PostgreSQL
sudo -u postgres createuser -s $USER
createdb zyno
```

### Installation du projet

```bash
# Cloner le dépôt
git clone https://github.com/daadi1919/zyno-cursor.git
cd zyno-cursor

# Installation des dépendances
pnpm install

# Configuration de l'environnement
cp .env.example .env
# Éditer .env avec vos configurations

# Démarrage des services
sudo systemctl start redis-server
sudo systemctl start postgresql
sudo systemctl start neo4j

# Développement
pnpm dev

# Build
pnpm build

# Tests
pnpm test
```

### Vérification de l'installation

```bash
# Vérifier les versions installées
node --version  # Devrait afficher v23.3.0
npm --version
pnpm --version
python3 --version
pip3 --version
docker --version
neo4j --version
```

## 🏗️ Structure du Projet

```
packages/
  ├── aepo/           # Moteur d'optimisation des requêtes
  ├── aeco/           # Moteur d'optimisation des réponses
  ├── rag/            # Système RAG
  ├── api/            # API Gateway
  └── web/            # Interface utilisateur
```

## 📝 Licence

Propriétaire - Tous droits réservés 

# Zyno Cursor

Service d'authentification et d'autorisation pour Zyno.

## Fonctionnalités

- Gestion des utilisateurs et des rôles
- Authentification par API Key
- Gestion des sessions
- Journalisation des accès
- Cache utilisateur
- Gestion des erreurs

## Installation

```bash
npm install @zyno/aepo
```

## Configuration

```typescript
import { AuthService, SessionService, AccessLogger } from '@zyno/aepo';

const authService = new AuthService({
  apiKeyLength: 32,
  passwordHashRounds: 10,
  cacheSize: 1000,
  cacheTTL: 3600,
});

const sessionService = new SessionService(
  errorHandlingService,
  24 * 60 * 60 * 1000, // 24 heures
  5 // Maximum 5 sessions par utilisateur
);

const accessLogger = new AccessLogger({
  maxEntries: 10000,
  retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 jours
  logIpAddress: true,
  logUserAgent: true,
});
```

## Utilisation

### Authentification

```typescript
// Créer un utilisateur
const user = await authService.createUser({
  email: 'user@example.com',
  password: 'password123',
  role: 'user',
});

// Valider une API Key
const isValid = await authService.validateApiKey(apiKey);

// Mettre à jour le rôle d'un utilisateur
await authService.updateUserRole(userId, 'admin');

// Rotation de l'API Key
const newApiKey = await authService.rotateApiKey(userId);
```

### Sessions

```typescript
// Créer une session
const session = await sessionService.createSession(
  user,
  token,
  userAgent,
  ipAddress
);

// Valider une session
const isValid = await sessionService.validateSession(sessionId, token);

// Invalider une session
await sessionService.invalidateSession(sessionId);

// Obtenir les statistiques des sessions
const stats = await sessionService.getSessionStats();
```

### Journalisation

```typescript
// Journaliser un accès
await accessLogger.logAccess(
  user,
  'login',
  '/auth/login',
  'success',
  undefined,
  {
    loginMethod: 'credentials',
    userAgent: 'Mozilla/5.0...',
    ipAddress: '127.0.0.1',
  }
);

// Obtenir les logs
const logs = await accessLogger.getLogs({
  userId: 'user-123',
  action: 'login',
  status: 'success',
});

// Exporter les logs
const jsonLogs = await accessLogger.exportLogs('json');
const csvLogs = await accessLogger.exportLogs('csv');
```

## Tests

```bash
# Exécuter les tests
npm test

# Exécuter les tests en mode watch
npm run test:watch

# Générer la couverture de code
npm run test:coverage
```

## Contribution

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/amazing-feature`)
3. Commit vos changements (`git commit -m 'Add some amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## Licence

MIT 