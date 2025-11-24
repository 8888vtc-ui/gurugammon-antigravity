# Statut global du projet GuruGammon + bgammon

## ✅ Ce qui est en place et fonctionnel

- **Serveur GuruGammon backend**
  - API Express.js + Prisma sur Supabase/PostgreSQL (endpoints jeux, tournois, IA GNUBG, stats, etc.).
  - Authentification JWT (access/refresh tokens) et WebSockets temps réel (partie, matchmaking, tournois, notifications).
  - Monitoring Prometheus exposé via `/metrics`.
- **Frontend Vue 3 (SPA)**
  - Application monopage (Vite + Vue 3) avec plateau `GameBoard.vue` et vues multiplayer (`MultiplayerGameView.vue`, `GameChat.vue`).
  - `GameBoard.vue` connecté à bgammon pour afficher `board`/`dice`/`moves` issus du serveur.
  - `MultiplayerGameView.vue` intègre un bouton 🌐 **bgammon** pour rejoindre une partie de test.
- **Serveur bgammon (Go)**
  - Script : `npm run dev:bgammon` lance `bgammon-server/main.go`.
  - Écoute des connexions WebSocket sur `VITE_BGAMMON_WS_URL` (par ex. `ws://localhost:8080` en dev).
- **Client bgammon côté frontend** (`frontend/src/services/bgammonClient.ts`)
  - Gère `connect(username)`, `subscribe` / `unsubscribe`, `move`, `roll`, `confirmOk`, `joinMatch`, `leaveMatch`, `sendChat`.
  - Parse les messages JSON et expose un état typé `BgammonState` `{ board: number[], dice: number[], moves: string[], raw }`.
- **QA bgammonClient**
  - Typage strict (`BgammonState`, `BgammonEventHandler`) et centralisation du parsing JSON (`parseBgammonPayload`).
  - Accès typé aux variables d’environnement (`import.meta.env.VITE_BGAMMON_WS_URL`), suppression de `window.location`.
  - Gestion des erreurs WebSocket (log structuré dans `onerror`, exception si envoi alors que le socket n’est pas ouvert).
- **Intégration dans GameBoard.vue**
  - Le plateau lit `state.board` via `bgammonState` et `mapBoardToCheckers` pour afficher les pions.
  - Les dés affichés proviennent de `state.dice` bgammon.
  - Un bloc debug affiche également `bgammonState.dice` et `bgammonState.moves`.
- **Actions utilisateur synchronisées avec bgammon**
  - `rollDice()` → envoie `bgammonClient.roll()` (aucune mise à jour locale directe des dés).
  - `makeMove(move)` → envoie `bgammonClient.move(["from-to"])` et attend la mise à jour du plateau via bgammon.
  - `endTurn()` → envoie `bgammonClient.confirmOk()` pour signaler la fin de tour au serveur.
- **Vue multijoueur + bouton bgammon**
  - `MultiplayerGameView.vue` contient un bouton 🌐 **bgammon** qui :
    - connecte l’utilisateur courant à bgammon si nécessaire,
    - appelle `bgammonClient.joinMatch('test-game')`,
    - loggue `Joined bgammon game as <username>` pour debug.
- **Tests Jest / Supertest**
  - Suites de tests couvrant les jeux, quotas IA, matchmaking, tournois, WebSockets backend.
  - Test dédié `tests/bgammonClient.test.ts` validant le flux `connect` + `subscribe` → réception de `{ board, dice, moves }`.

## 🟡 Ce qui reste à connecter / améliorer – Roadmap priorisée

### P1 – Bloquants immédiats

- **Mapping complet `state.board`**
  - Couvrir les cases spéciales (barre, off, points exacts par couleur) et refléter précisément le modèle bgammon dans le plateau Vue.
- **Intégration complète du protocole bgammon**
  - Gérer les commandes `create` / `join` réelles (public/privé, points, variantes) au‑delà du simple `test-game`.
  - Gérer les événements serveur (`welcome`, `joined`, `game`, `win`, etc.) dans une couche dédiée (store / service) pour mettre à jour l’état de partie.

### P2 – Alignement et robustesse

- **Alignement avec le matchmaking GuruGammon**
  - Aligner les identités/players GuruGammon avec les utilisateurs bgammon (login/register côté bgammon si nécessaire).
  - Synchroniser le lobby / matchmaking / tournois GuruGammon avec la création/join de tables bgammon (invitations, rounds, scoring).
- **UX d’erreurs et reconnexions automatiques**
  - Afficher des messages clairs côté UI en cas d’erreur réseau (bgammon down, perte de connexion, timeouts).
  - Implémenter des stratégies de reconnexion côté client (backoff, reprise d’état de partie en cours).

### P3 – Fonctionnalités avancées

- **Règles de cube avancées**
  - Implémenter la règle Jacoby et autres options (beaver, raccoon, etc.) de manière cohérente entre GuruGammon et bgammon.
- **Dashboard utilisateur enrichi**
  - Étendre le dashboard pour afficher quotas IA, leaderboards complets, historique détaillé des parties et analyses bgammon/GNUBG.

## 🔴 Dépendances critiques et prérequis

- **Environnement backend**
  - Node.js 20+ (cf. `"node": "20.11.1"` dans `package.json`).
  - Base de données PostgreSQL (Supabase) et migrations Prisma appliquées.
- **Environnement frontend**
  - Vite/Vue 3 avec `VITE_BGAMMON_WS_URL` configuré, typiquement :
    - Dev local : `VITE_BGAMMON_WS_URL=ws://localhost:8080`.
    - Prod/staging : valeur adaptée (`wss://...`) si un bgammon distant est utilisé.
- **Environnement bgammon**
  - Go toolchain installé (Go 1.25+), nécessaire pour `npm run dev:bgammon`.
  - Dépendances Go résolues automatiquement via le module `codeberg.org/tslocum/bgammon`.
  - Compréhension de la licence bgammon (**AGPL-3.0**), documentée dans `LICENSE.bgammon` et `README.md`.
- **Dépendances réseau**
  - Ports ouverts en local :
    - `3000` pour le backend GuruGammon,
    - `5173` (ou équivalent) pour le frontend Vite,
    - `8080` pour le serveur bgammon WebSocket.
  - Accès vers Internet pour récupérer les modules Go et, éventuellement, dialoguer avec un bgammon distant.
- **Déploiement**
  - Configuration Render / Netlify alignée avec `render.yaml` et `netlify.toml` pour les environnements hébergés.
