# 🎲 GammonGuru Backend

Plateforme backgammon pilotée par **Express.js**, **Prisma** et **Supabase**, avec un frontend React. Le moteur d’IA GNUBG est en cours d’intégration.

> Nouvelle fiche produit stratégique: lisez la présentation complète du produit, du positionnement et de la roadmap dans [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md). Pour les garanties de sécurité, consultez [SECURITY.md](./SECURITY.md). Pour une vue d’ensemble technique complète et toujours à jour, référez‑vous au [Guide du projet](./docs/PROJECT_GUIDE.md).

## Architecture

| Couche | Technologie | Rôle |
| --- | --- | --- |
| Backend API | Express.js (Render) + Netlify Functions | Routes REST `/api/games` + extensions serverless |
| Frontend | React + Vite | SPA consommatrice des endpoints REST |
| Base de données | Supabase PostgreSQL | Persistance via Prisma Client |
| IA | GNUBG (intégration en cours) | Suggestions & évaluations de positions |

## Endpoints actifs

```
POST /api/games
GET  /api/games/:id/status
POST /api/games/:id/join
POST /api/games/:id/roll
POST /api/games/:id/move
POST /api/games/:id/resign
POST /api/games/:id/draw
POST /api/games/:id/suggestions
POST /api/games/:id/evaluate
POST /api/games/:id/cube/double
POST /api/games/:id/cube/take
POST /api/games/:id/cube/pass
POST /api/games/:id/cube/redouble
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/user/profile
PUT  /api/user/profile
GET  /api/user/dashboard
GET  /api/gnubg/quota
POST /api/gnubg/purchase
POST /api/tournaments
POST /api/tournaments/:id/join
GET  /api/tournaments/:id
GET  /api/tournaments/:id/participants
GET  /api/tournaments/:id/leaderboard
GET  /api/players
GET  /api/players/country/:countryCode
GET  /api/players/season/:seasonId
```

### ⚙️ Options du cube (match rules)

Les matchs activent par défaut les règles suivantes (cf. `MatchRulesOptions` dans `src/services/rules/matchEngine.ts`) :

| Option | Description | Activation |
| --- | --- | --- |
| Crawford | Interdit de doubler pendant la partie Crawford (USBGF §2.10). | ✅ Activé (désactivable par configuration match). |
| Beaver | Joueur redoublé peut immédiatement redoubler en gardant le cube. | ✅ Optionnel (activé si `rules.beaver = true`). |
| Raccoon | Joueur initial peut redoubler immédiatement après un beaver. | ✅ Optionnel (activé si `rules.raccoon = true`). |
| Jacoby | Gammons/backgammons scorés seulement si cube actionné (money games). | ❌ À implémenter. |

Pour créer un match avec des règles personnalisées, fournissez l’objet `rules` adéquat lors de la configuration du match (API tournoi ou future route match setup). Le détail de la logique se trouve dans `src/services/rules/cubeLogic.ts` et les tests associés `tests/rules/cubeLogic.test.ts`.

### 🏳️ Résignation

Endpoint : `POST /api/games/:id/resign`

```json
{
  "resignationType": "SINGLE" | "GAMMON" | "BACKGAMMON"
}
```

### 📊 Dashboard utilisateur & Leaderboards

- Endpoint : `GET /api/user/dashboard` (authentification obligatoire)
- Réponse :

```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "user-123",
      "username": "BackgammonPro",
      "country": "FR",
      "eloRating": 1720,
      "gamesPlayed": 128,
      "gamesWon": 82,
      "winRate": 0.64,
      "currentStreak": 6,
      "bestStreak": 12,
      "plan": "premium"
    },
    "season": {
      "seasonId": "season-1",
      "name": "Winter Championship",
      "rankGlobal": 4,
      "rankCountry": 1,
      "elo": 1805,
      "winrate": 0.72,
      "gamesPlayed": 45
    },
    "quota": {
      "plan": "premium",
      "used": 7,
      "limit": 10,
      "extra": 2,
      "history": [
        {
          "seasonId": "season-1",
          "quotaUsed": 3,
          "timestamp": "2025-11-10T08:00:00.000Z"
        }
      ]
    },
    "recentGames": [
      {
        "id": "game-1",
        "finishedAt": "2025-11-11T20:00:00.000Z",
        "opponent": {
          "id": "opponent-1",
          "username": "LuckyRoller"
        },
        "role": "white",
        "result": "win",
        "score": {
          "user": 5,
          "opponent": 3
        }
      }
    ],
    "recentAnalyses": [
      {
        "id": "analysis-1",
        "gameId": "game-1",
        "createdAt": "2025-11-11T21:00:00.000Z",
        "servicesUsed": ["evaluate", "suggest"]
      }
    ]
  }
}
```

- Options : si aucune saison active ou historique quota, les champs `season` et `quota.history` sont `null` / tableau vide. Les récents matchs/analyses sont limités (10/5 entrées).
- Leaderboards REST :
  - `GET /api/players` → classement global (tri ELO, fallback winrate/games)
  - `GET /api/players/country/:countryCode` → classement par pays (code ISO2)
  - `GET /api/players/season/:seasonId` → classement saison en cours (`season_leaderboard`)

Les services et contrôleurs associés sont couverts par des tests Jest (`tests/leaderboard/*`, `tests/dashboard/*`).

- Cube pris en compte automatiquement (`cubeLevel`).
- Jacoby : si activé et cube non tourné, la résignation est ramenée à `SINGLE`.
- Sortie : scores mis à jour, détection fin de match (`matchEngine.applyPointResult`).
- Implémentation principale : `src/services/rules/resignationService.ts`.

## Mise en route

```bash
# 1. Cloner & installer
git clone https://github.com/8888vtc-ui/gnubg-backend.git
cd gnubg-backend
npm install

# 2. Variables d’environnement
cp .env.example .env

# 3. Migrations & client Prisma
npx prisma migrate dev
npx prisma generate

# 4. Lancer le serveur Express
npm run dev
```

Le serveur écoute par défaut sur `http://localhost:3000`. Les tests automatiques sont désactivés tant que la couverture n’est pas en place.

## Répertoires clés

```
src/
 ├─ controllers/   # Handlers Express
 ├─ routes/        # Déclarations de routes
 ├─ services/      # GameService, AIService, utilitaires
 ├─ middleware/    # Authentification & guards
 └─ types/         # Types partagés domaine/IA
prisma/
 ├─ schema.prisma
 └─ migrations/
tests/
```

### 🧪 Tests Jest/Supertest

Le backend Express est couvert par une suite de tests automatisés utilisant [Jest](https://jestjs.io/) et [Supertest](https://github.com/ladjs/supertest).

#### 📦 Installation des dépendances

```bash
npm install --save-dev jest ts-jest supertest @types/jest @types/supertest
```

#### 🚀 Lancer les tests

```bash
npm test -- tests/game.test.ts
npm test -- tests/gnubgQuota.test.ts
npm test -- tests/matchmaking/matchmakingService.test.ts
npm test -- tests/tournament/tournamentService.test.ts
```

#### ✅ Couverture actuelle

- Jeux : création/suggestions/évaluations (`tests/game.test.ts`).
- Quotas IA : parcours premium/free, resets, rafales concurrentes + notifications (`tests/gnubgQuota.test.ts`).
- Matchmaking : statut, match found, invitations WS (`tests/matchmaking/*`).

#### 🧪 Mocks utilisés

- Middleware auth (`tests/__mocks__/authMiddleware.ts`).
- Prisma mock in-memory (`tests/utils/prismaMock.ts`).
- Provider GNUBG et NotificationService mockés selon les scénarios.

### 📡 WebSocket temps réel

| Canal | URL | Auth | Payload | Usage | Tests |
| --- | --- | --- | --- | --- | --- |
| Partie | `wss://gammon-guru-api.onrender.com/ws/game?gameId={id}` | JWT (`Authorization` ou `Sec-WebSocket-Protocol`) | `GAME_JOIN`, `GAME_MOVE`, `GAME_RESIGN`, `GAME_DRAW` | Synchronisation des coups & résignations | `tests/game.test.ts` + e2e manuels |
| Matchmaking | `wss://…/ws/matchmaking` | JWT | `MATCHMAKING_STATUS`, `MATCHMAKING_FOUND` | Suivi temps réel de la file d’attente | `tests/matchmaking/matchmakingService.test.ts` |
| Tournoi | `wss://…/ws/tournament?tournamentId={id}` | JWT | `playerJoined`, `matchCreated`, `matchFinished`, `tournamentUpdated`, `tournamentEnded` | Broadcast participants / rounds | `tests/tournament/tournamentService.test.ts` |
| Notifications | `wss://…/ws/notifications` | JWT | `NOTIFICATION` (enveloppe typée) | Feedback joueur (quota, victoires, invitations) | `tests/gnubgQuota.test.ts` |

Pour une description détaillée du protocole de reconnexion (handshake, replays, ACKs, heartbeat), voir [docs/WEBSOCKET_RECONNECT.md](./docs/WEBSOCKET_RECONNECT.md).

Le client côté front (`frontend/src/services/websocket.client.js`) gère la reconnexion exponentielle, la multiplexion des handlers et l’acknowledgement des messages.

### 🔔 Notifications temps réel

Le service `NotificationService` centralise la diffusion d’événements joueurs. Les notifications sont typées via `NotificationEnvelope` et propagées sur `/ws/notifications`.

| Méthode | Déclencheur | Payload principal |
| --- | --- | --- |
| `notifyQuotaExhausted` | 429 IA (`checkAndConsumeQuota`) | plan, quotas restants, suggestion upsell |
| `notifyQuotaReset` | Reset quotidien ou `ensureQuotaRecord` | plan, quotas disponibles |
| `notifyVictory` | `GameService.makeMove` (statut `finished`) | gameId, adversaire |
| `notifyInvitation` | Matchmaking & tournois | source (`match`/`tournament`), contexte, initiateur |

Les tests Jest vérifient les déclencheurs et enveloppes (`tests/gnubgQuota.test.ts`, `tests/matchmaking/matchmakingService.test.ts`).

#### 📊 Prometheus & monitoring

- `tournament_participants_total{action="join|leave"}` : suivi des entrées/sorties.
- `tournaments_started_total` : compte des lancements de tournois.
- `tournament_matches_total{event="scheduled|auto_advance|completed"}` : activité matchs.
- Exposés via `/metrics` (Prometheus 0.0.4).

### 🔐 Quotas IA

GammonGuru limite les appels IA pour garantir la viabilité du service.

- **Free** : 5 analyses offertes à l’inscription
- **Premium** : 10 analyses/jour
- Achat d’analyses supplémentaires via `POST /api/gnubg/purchase`
- Chaque appel IA consomme une analyse. Le quota est affiché dans le dashboard (intégration à venir).

#### 🎯 Flux GNUBG pilotés

Le service `gnubgService` implémente une politique de quotas robuste couvrant les cas free & premium :

1. **Priorité premium** – Les utilisateurs premium consomment d’abord `premiumQuota`.
2. **Fallback daily** – Si `premiumQuota` est épuisé, la consommation bascule automatiquement sur `dailyQuota`.
3. **Extras en dernier recours** – Une fois les quotas standards épuisés, des crédits supplémentaires (`extrasUsed`) peuvent être consommés.
4. **Reset automatique** – Les quotas sont régénérés quotidiennement via `resetAt` (UTC).
5. **Logging structuré** – Chaque consommation, reset ou blocage est journalisé (debug pour les consommations, warn quand le quota est épuisé, error côté provider).

Ces flux sont couverts par la suite Jest `tests/gnubgQuota.test.ts` et fournissent une base solide pour étendre l’IA (tournois, analyses avancées). Les intégrations futures peuvent se brancher sur `checkAndConsumeQuota` pour bénéficier automatiquement de ce comportement.

#### Réponse `GET /api/gnubg/quota`

```json
{
  "plan": "premium",
  "used": 7,
  "limit": 10,
  "extra": 0
}
```

### 🔄 Authentification JWT

- Access token de 15 minutes
- Refresh token de 7 jours avec rotation (`POST /api/auth/refresh`)
- Refresh stockés (hashés) en base et révoqués automatiquement lors du logout
- Champs `jti` pour suivre les rotations et éviter la réutilisation

### 🤖 Résilience GNUBG

- Timeout configurable via `GNUBG_TIMEOUT_MS`
- Retry/backoff exponentiel (`GNUBG_MAX_RETRIES`)
- Circuit breaker après 3 échecs (`GNUBG_CIRCUIT_THRESHOLD` / `GNUBG_CIRCUIT_COOLDOWN_MS`)
- Logs structurés (erreurs, retries, ouverture/fermeture du circuit)

## Liens utiles

- documentation API : `API_DOCUMENTATION.md`
- fiche produit stratégique : `PRODUCT_OVERVIEW.md`
- déploiement Render & Netlify : `DEPLOYMENT.md`
- sécurité backend : `SECURITY.md`
- suivi produit : `PROJECT_OVERVIEW.md`

## Licences

- Le backend et le frontend GuruGammon sont publiés sous licence MIT (voir `LICENSE`).
- Le moteur d'analyse IA utilise **GNUBG** (GNU Backgammon), qui est sous licence GPL. L'intégration se fait via un service séparé respectant les termes de la licence.

---

_GammonGuru – refonte backend 2025_
