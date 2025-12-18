# Changelog - GuruGammon

Toutes les modifications notables du projet sont documentées ici.

## [Unreleased] - Session Autonome 18/12/2025

### 🏷️ Renaming
- **GNUBg → GuruBot**: Renommage complet de l'IA
  - Frontend: Tous les labels et messages
  - Backend: ID de l'IA `ai-gnubg` → `ai-gurubot`
  - Affichage: "GuruBot AI" au lieu de "GNUBg"

### Added - P1 Fixes
- **Types TypeScript Frontend** (`guru-react/src/types/game.ts`)
  - `BoardState`, `GameState`, `PlayerColor`, `DiceState`, `Move`, `Player`
  - Helper `getCheckersForPoint()` pour mapping robuste
  - Constante `INITIAL_BOARD`

- **Modal de fin de partie** (`GameEndModal.tsx`)
  - Animation d'entrée/sortie avec framer-motion
  - Affichage du gagnant avec trophée/médaille
  - Types de victoire: Single, Gammon, Backgammon
  - Calcul des points: base × cube × multiplier
  - Actions: Rematch, Share, Exit

### Added - P2 Fixes
- **Indicateur de connexion** (`ConnectionIndicator.tsx`)
  - États visuels: Live, Reconnecting, Offline
  - Bouton de reconnexion manuelle
  - Message d'erreur détaillé

- **Configuration Vite optimisée** (`vite.config.ts`)
  - Proxy WebSocket (`/ws`)
  - Code splitting (vendor, animations)
  - Sourcemaps activés
  - Host mode pour accès réseau

### Added - P3 Features
- **Doubling Cube Component** (`DoublingCube.tsx`)
  - Support complet Jacoby, Crawford, Beaver, Raccoon
  - Animations interactives
  - Indicateurs de règles actives
  - Match info display

- **Game History Component** (`GameHistory.tsx`)
  - Historique complet des parties
  - Expansion pour détails
  - Stats rapides (wins, losses, points)
  - Actions Replay et Rematch

- **Leaderboard Component** (`Leaderboard.tsx`)
  - Classement temps réel via WebSocket
  - Tri par ELO, winrate, games
  - Indicateurs de rank change
  - Avatar et streak display

- **Components Index** (`components/index.ts`)
  - Export centralisé de tous les composants

### Added - Tests E2E
- **Tests GuruBot Coach** (`tests/e2e/gurubot_coach.spec.ts`)
  - Tests de branding GuruBot
  - Tests de création de partie vs IA
  - Tests du modal coach
  - Tests de performance IA
  - Tests de stabilité WebSocket
  - Tests UI du modal

- **Documentation Tests** (`tests/e2e/README.md`)
  - Guide d'exécution
  - Résolution des erreurs
  - Variables d'environnement

### Changed
- **Composant Board** (`Board.tsx`)
  - Typage complet avec `BoardState`
  - Affichage du Bar (pièces capturées)
  - Affichage du Bear Off (pièces sorties)

- **Hook useWebSocket** (`useWebSocket.ts`)
  - Reconnexion automatique avec exponential backoff
  - Maximum 10 tentatives (1s → 30s)

- **Page Game** (`Game.tsx`)
  - Label "Analyse GuruBot" au lieu de "Analyse GNUBg"
  - Intégration ConnectionIndicator

- **Page Lobby** (`Lobby.tsx`)
  - "Practice with GuruBot AI" au lieu de "Practice with GNUBG"

- **CoachModal** (`CoachModal.tsx`)
  - "Consulting GuruBot AI & DeepSeek R1"

- **Backend AI Player** (`gameService.ts`)
  - ID: `ai-gurubot`
  - Name: `GuruBot AI`

### Fixed
- Imports non utilisés dans tous les nouveaux composants
- Types payload WebSocket avec assertions appropriées

---

## [1.0.0] - 2025-11-27

### Initial Release
- Backend Node.js/Express avec Prisma
- Frontend React avec Vite
- Authentification JWT
- WebSocket temps réel
- Mode Jouer contre l'IA (GNUBg)
- Système de tournois
- Coach IA DeepSeek R1
- Monitoring Prometheus
