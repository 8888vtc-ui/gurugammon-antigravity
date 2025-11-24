# GuruGammon – Intégration bgammon-server

Ce document décrit comment le frontend GuruGammon se connecte au serveur Go `bgammon-server` pour récupérer l’état de la partie et assurer la synchro temps réel.

## Endpoints serveur

Configuration centralisée dans `frontend/src/config/server.ts` :

```ts
export const SERVER_URL = 'http://localhost:8080'
export const LOGIN_ENDPOINT = '/login'
export const GAME_ENDPOINT = '/game'
```

### 1. POST /login

- URL complète : `${SERVER_URL}${LOGIN_ENDPOINT}` → `http://localhost:8080/login`
- Méthode : `POST`
- Corps (JSON minimal utilisé côté front) :

```json
{
  "username": "PlayerName"
}
```

- Rôle : enregistrer / authentifier l’utilisateur côté `bgammon-server` (login simple).  
  Le mot de passe est actuellement optionnel côté front – la sécurité réelle dépendra de l’implémentation Go.

### 2. GET /game

- URL complète : `${SERVER_URL}${GAME_ENDPOINT}` → `http://localhost:8080/game`
- Méthode : `GET`
- Réponse : JSON compatible avec le moteur **bgammon** (GameState / EventBoard), par ex. :

```json
{
  "Board": [
    0, -2, 0, 0, 0, 5, 0, 0, 3, 0, 0, -5,
    5, 0, 0, -3, 0, 0, 0, 2, 0, 0, 0, -2,
    1, 0, 3, -1
  ],
  "Roll1": 3,
  "Roll2": 4,
  "Moves": ["13/10", "6/3"],
  "PlayerNumber": 1,
  "Player1": { "Points": 5 },
  "Player2": { "Points": 2 },
  "DoubleValue": 2,
  "DoublePlayer": 1
}
```

Le frontend utilise `parseBgammonPayload` (dans `frontend/src/services/bgammonClient.ts`) pour normaliser ce JSON en `BgammonState` exploitable par Vue :

```ts
export interface BgammonState {
  board: number[]
  dice: number[]
  moves: string[]
  checkers?: { point: number; color: 'white' | 'black'; count: number }[]
  bar?: { color: 'white' | 'black'; count: number }[]
  off?: { color: 'white' | 'black'; count: number }[]
  cubeValue?: number
  cubeOwner?: 'user' | 'opponent' | null
  scoreUser?: number
  scoreOpponent?: number
}
```

- `board` : tableau 28 cases (0–23 = points, 24/25 = bar white/black, 26/27 = off white/black).  
- `dice` : `[Roll1, Roll2]` filtrés (> 0).  
- `moves` : mouvements possibles/choisis sous forme de chaînes.  
- `checkers` / `bar` / `off` : vue agrégée dérivée de `board`.  
- `cubeValue` / `cubeOwner` : dérivés de `DoubleValue` / `DoublePlayer` (1/2 → user/opponent selon `PlayerNumber`).  
- `scoreUser` / `scoreOpponent` : dérivés de `Player1.Points` / `Player2.Points`.

### 3. WebSocket /ws

Le client WebSocket est géré par `bgammonClient` via la variable d’environnement `VITE_BGAMMON_WS_URL` (cf. `frontend/.env.example`).  
Pour un `bgammon-server` local, la valeur recommandée est :

```env
VITE_BGAMMON_WS_URL=ws://localhost:8080/ws
```

Le serveur envoie alors des événements JSON (GameState, coups, doubles, etc.).  
Tous les messages `json …` sont parsés par `parseBgammonPayload` puis diffusés aux composants Vue via `bgammonClient.subscribe`.

## Intégration dans GameBoard.vue

`frontend/src/components/GameBoard.vue` utilise **deux canaux** :

1. **HTTP initial** (`/login` + `/game`)
2. **WebSocket temps réel** (bgammonClient)

### 1. Login + état initial HTTP

Dans `setup()` :

```ts
import { SERVER_URL, LOGIN_ENDPOINT, GAME_ENDPOINT } from '@/config/server'
import bgammonClient, { parseBgammonPayload } from '@/services/bgammonClient'

const loginToBgammonServer = async (username) => {
  if (typeof fetch === 'undefined') return
  await fetch(`${SERVER_URL}${LOGIN_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  })
}

const fetchInitialGameState = async () => {
  if (typeof fetch === 'undefined') return
  const response = await fetch(`${SERVER_URL}${GAME_ENDPOINT}`)
  if (!response.ok) return
  const json = await response.json()
  const state = parseBgammonPayload(json)
  bgammonHandler(state)
}

onMounted(async () => {
  const username = getCurrentUserName()
  await loginToBgammonServer(username)
  await fetchInitialGameState()
  // ... connexion WebSocket ensuite
})
```

`bgammonHandler(state)` met à jour :

- `bgammonState` (utilisé par le panneau debug + DoublingCube).
- `dice`, `checkers`, `barCheckers`, `offCheckers` (superposition graphique sur le plateau premium).

### 2. Synchro temps réel via WebSocket

Après l’état initial HTTP, `GameBoard.vue` établit la connexion WebSocket :

```ts
onMounted(async () => {
  const username = getCurrentUserName()
  await loginToBgammonServer(username)
  await fetchInitialGameState()

  try {
    await bgammonClient.connect(username)
  } catch (e) {
    console.error('Erreur connexion bgammon', e)
  }
  bgammonClient.subscribe(bgammonHandler)
})

onUnmounted(() => {
  bgammonClient.unsubscribe(bgammonHandler)
})
```

À chaque message JSON reçu sur le WebSocket (`json …`), `bgammonClient` :

1. Parse le texte JSON.
2. Appelle `parseBgammonPayload`.
3. Diffuse le `BgammonState` résultant à tous les abonnés.

`GameBoard` reçoit alors l’état à jour (cube, score, dés, pions, bar/off) et met le plateau à jour automatiquement.

## Lancer bgammon-server localement

Le dépôt Go `bgammon-server/` est déjà présent dans ce projet. Le workflow typique est :

```bash
cd bgammon-server
# Adapter éventuellement la commande selon le README du serveur
go run ./...
# ou
go run ./cmd/server
```

Assurez-vous que le serveur écoute sur `http://localhost:8080` et expose :

- `POST /login`
- `GET  /game`
- `WS   /ws`

Puis côté frontend :

```bash
cd frontend
cp .env.example .env
# Dans .env, configurer VITE_BGAMMON_WS_URL=ws://localhost:8080/ws si besoin
npm install
npm run dev
```

## RNG & équité

- Le **RNG** (tirage des dés, doubles) est entièrement géré côté `bgammon-server` / moteur bgammon.  
- Le frontend ne fait que consommer les états émis (dés, cube, scores) et les afficher.  
- Cela garantit une source unique de vérité côté serveur pour :
  - Les dés (`Roll1`/`Roll2` → `dice[]`).
  - L’état du cube (`DoubleValue` / `DoublePlayer` → `cubeValue` / `cubeOwner`).
  - Les scores (`Player1/Player2.Points` → `scoreUser` / `scoreOpponent`).

## Tests

Les tests Vue dans `tests/GameBoard.spec.ts` :

- Mockent `@/config/server` pour éviter tout appel réseau réel.
- Mockent `@/services/bgammonClient` pour contrôler la synchro temps réel.
- Vérifient que :
  - Le plateau premium est rendu.
  - Les pions sont positionnés correctement.
  - Les scores et le cube bgammon s’affichent conformément à l’état reçu.

## Bypass local du login Netlify (HomeView)

En environnement Netlify (prod), la page d’accueil `HomeView.vue` utilise une fonction serverless :

```text
/.netlify/functions/login-debug
```

Cette URL **n’existe pas** quand on lance le frontend en local avec `npm run dev` (Vite), ce qui provoque un `HTTP 404: Not Found` lors de la connexion.

Pour éviter ce problème en **développement local**, `HomeView.vue` contient un bypass :

```ts
async function login() {
  if (!email.value || !password.value) {
    loginStatus.value = '❌ Veuillez saisir email et mot de passe'
    return
  }

  if (window.location.hostname === 'localhost') {
    loginStatus.value = '✅ Connexion simulée en local'
    try {
      localStorage.setItem('authToken', 'local-dev-bypass')
    } catch (e) {
      // ignore storage errors in local dev
    }
    router.push('/game')
    return
  }

  // Sinon (Netlify / prod) : appel réel à /.netlify/functions/login-debug
  // ...
}
```

Effets en local (`hostname === 'localhost'`) :

- Le bouton **"Se connecter"** ne contacte pas Netlify.
- `loginStatus` affiche `✅ Connexion simulée en local`.
- Un token factice `authToken = 'local-dev-bypass'` est posé dans `localStorage` afin que le **router guard** (`router/index.ts`) considère l’utilisateur comme authentifié.
- L’utilisateur est redirigé vers `/game`, où la partie bgammon peut être testée (plateau premium + synchro bgammon-server).

En production Netlify (ou tout environnement où `hostname !== 'localhost'`), le code existant continue à appeler `/.netlify/functions/login-debug`, qui effectue le **vrai login** côté backend (Express/Netlify) avec les identifiants réels.

Les tests Vue dans `tests/HomeView.spec.ts` vérifient ce comportement de bypass local en forçant `window.location.hostname = 'localhost'`, en soumettant le formulaire, puis en contrôlant :

- la présence de `✅ Connexion simulée en local` dans le texte rendu,
- la présence du token `authToken` dans `localStorage`,
- la navigation effective vers la route `/game`.

## Local vs Production

- **Local (Vite)**
  - Login : bypass Netlify → `authToken = "local-dev-bypass"` dans `localStorage`, redirection vers `/game`.
  - Serveur bgammon : `http://localhost:8080` avec `POST /login`, `GET /game`, `WS /ws` (`VITE_BGAMMON_WS_URL=ws://localhost:8080/ws`).

- **Production (Netlify)**
  - Login : appel réel à `/.netlify/functions/login-debug`.
  - Aucun bypass : l’auth dépend du backend Netlify/Express, pas du token local.

## Phase 3.1 – Synchro réelle bgammon-server

Cette phase consiste à brancher GuruGammon sur un **bgammon-server réel** (Go) et à valider la synchro temps réel (dés, cube, scores, pions).

### 1. Configuration côté frontend

- `frontend/src/config/server.ts` :
  - `SERVER_URL = 'http://localhost:8080'`
  - `LOGIN_ENDPOINT = '/login'`
  - `GAME_ENDPOINT = '/game'`
  - `WS_URL = 'ws://localhost:8080/ws'`
- `.env` (ou `.env.local`) dans `frontend/` :
  - `VITE_BGAMMON_WS_URL=ws://localhost:8080/ws`

### 2. Flux dans GameBoard.vue

1. **Phase HTTP**
   - `POST /login` avec `{ username }` pour enregistrer le joueur côté bgammon.
   - `GET /game` pour récupérer un `GameState` / `EventBoard` initial.
   - Le JSON est normalisé par `parseBgammonPayload` en `BgammonState` puis injecté dans `bgammonHandler`.

2. **Phase WebSocket**
   - `bgammonClient.connect(username)` ouvre un WebSocket sur `VITE_BGAMMON_WS_URL`.
   - Chaque message JSON (`json ...`) est parsé → `BgammonState` → `bgammonHandler`.
   - `GameBoard.vue` met à jour automatiquement :
     - dés (`dice`),
     - pions (`checkers`, `barCheckers`, `offCheckers`),
     - cube bgammon (`cubeValue`, `cubeOwner`),
     - scores (`scoreUser`, `scoreOpponent`).

### 3. Protocole de validation visuelle

1. Lancer `bgammon-server` en local sur `http://localhost:8080` (voir plus haut).
2. Dans `frontend/` :
   - `cp .env.example .env` si besoin.
   - Vérifier que `VITE_BGAMMON_WS_URL=ws://localhost:8080/ws`.
   - `npm install` puis `npm run dev`.
3. Ouvrir `http://localhost:5173/`.
4. Sur la page d’accueil, saisir un email/mot de passe quelconque puis cliquer **Se connecter** :
   - en local : bypass Netlify → token `local-dev-bypass` + redirection vers `/game`.
5. Sur `/game` (GameBoard) :
   - vérifier que le **plateau premium** s’affiche,
   - que des **pions** sont visibles,
   - que les **dés / cube / scores** évoluent quand des coups sont joués côté bgammon.

Si ces éléments se mettent à jour sans erreur console, la Phase 3.1 (câblage serveur + synchro temps réel) est considérée comme validée.
