# GuruGammon – État des lieux & Local vs Production

## Frontend

- Vite / Vue 3 / TypeScript opérationnels (`npm run dev` dans `frontend/`).
- `HomeView.vue` : bypass local quand `hostname === 'localhost'` :
  - ne contacte pas `/.netlify/functions/login-debug`.
  - pose `authToken = "local-dev-bypass"` dans `localStorage`.
  - redirige vers `/game`.
- `GameBoard.vue` :
  - HTTP : `POST /login`, `GET /game` via `frontend/src/config/server.ts`.
  - WebSocket : utilise `VITE_BGAMMON_WS_URL` (ex. `ws://localhost:8080/ws`) via `bgammonClient`.
  - Plateau premium `board.svg` + overlay de pions mappés depuis `BgammonState.checkers`.
- Tests Vue présents pour `GameBoard.vue`, `DoublingCube.vue`, `HomeView.vue` (lints TypeScript sur `jest/describe/test` non bloquants).

## Backend / bgammon-server

- Répertoire Go `bgammon-server/` présent dans le repo.
- Endpoints attendus par le frontend :
  - `POST /login`
  - `GET /game`
  - `WS /ws`
- Le frontend suppose que le serveur écoute sur `http://localhost:8080` et `ws://localhost:8080/ws`.

## Local vs Production

- **Local (Vite)**
  - Login : bypass Netlify → `authToken = "local-dev-bypass"` dans `localStorage`, redirection vers `/game`.
  - Serveur bgammon : `http://localhost:8080` avec `POST /login`, `GET /game`, `WS /ws` (`VITE_BGAMMON_WS_URL=ws://localhost:8080/ws`).

- **Production (Netlify)**
  - Login : appel réel à `/.netlify/functions/login-debug`.
  - Aucun bypass : l’auth dépend du backend Netlify/Express, pas du token local.

## Documentation actuelle

- `docs/SERVER.md` : décrit endpoints `/login`, `/game`, `/ws`, intégration `GameBoard.vue` + `bgammonClient`, et le bypass local.
- `docs/GRAPHICS.md` : décrit les assets graphiques, la palette, le plateau premium et les tests `GameBoard.spec.ts`.
- `docs/DB.md` : squelette de schéma (users, games, game_players, moves, elo_history).
- `docs/GNUBG.md` : squelette d’intégration gnubg (analyse, equity, blunders).

## Priorités courtes (Phase 3)

1. **P3.1 – Branchement bgammon-server (HTTP + WS)**
   - Statut : câblage HTTP + WebSocket implémenté dans `GameBoard.vue` + `bgammonClient`.
   - À faire : suivre le protocole de validation visuelle décrit dans `docs/SERVER.md` (lancer `bgammon-server`, lancer le frontend, vérifier dés/cube/scores/pions sur `/game`).

2. **P3.2 – Doc serveur & protocole de test visuel**
   - Statut : section dédiée dans `docs/SERVER.md` (Phase 3.1 – Synchro réelle).
   - À faire : ajuster au besoin après les premiers tests réels.

3. **P3.3 – Spéc DB & gnubg**
   - Statut : squelettes créés (`docs/DB.md`, `docs/GNUBG.md`).
   - À faire : détailler le schéma Prisma/migrations et le format JSON exact d’échange avec gnubg.
