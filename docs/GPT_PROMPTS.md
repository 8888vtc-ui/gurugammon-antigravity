# Prompts GPT 5.1 – GuruGammon Antigravity

Ce document liste des prompts prêts à l’emploi pour piloter GPT 5.1 (ou tout assistant avancé) sur le projet **GuruGammon Antigravity**.

Les prompts sont organisés par priorités :
- **Phase 1 :** Cœur de jeu (backend)
- **Phase 2 :** Intégration Front–Back
- **Phase 3 :** IA & GNUBG
- **Phase 4 :** UI/UX & polish
- **Phase 5 :** DevOps, tests & sécurité

---

## Phase 1 – Logique de jeu & règles (Backend)

**✅ Prompt 1 – Validation de base des coups**

> Analyse `src/services/gameService.ts` et implémente la validation stricte des mouvements dans la fonction ou le module de validation (par ex. `validateMove`). Assure-toi que les pions ne peuvent pas atterrir sur une pointe adverse occupée par plus d’un pion. Ajoute ou adapte les tests Jest nécessaires.

**✅ Prompt 2 – Gestion de la barre (hit)**

> Modifie la logique de mouvement dans `gameService.ts` pour gérer correctement la prise d’un pion (hit). Si un pion atterrit sur une pointe contenant exactement un pion adverse, ce pion adverse doit être déplacé sur la barre (`bar`) et le compteur approprié mis à jour dans l’état de jeu et en base.

**✅ Prompt 3 – Rentrée depuis la barre**

> Implémente la logique de rentrée des pions depuis la barre : tant qu’un joueur a des pions dans la barre, il doit obligatoirement les jouer avant tout autre coup. Intègre cette règle dans `gameService.ts` et bloque les autres mouvements dans l’API si `bar > 0`. Ajoute des tests qui couvrent les cas bloqués.

**✅ Prompt 4 – Sortie de pions (bearing off)**

> Ajoute la logique de bearing-off dans le moteur de jeu (module ou fonctions associées à `GameState`). Un joueur ne peut sortir des pions que si tous ses pions sont dans son home board. Gère les cas où le dé est supérieur à la distance restante (règles standard) et ajoute des tests Jest pour ces scénarios.

**✅ Prompt 5 – Détection de fin de partie**

> Implémente une fonction `checkWinCondition` (ou équivalent) dans `gameService.ts` qui est appelée après chaque mouvement. Si un joueur a sorti ses 15 pions, marque la partie comme `FINISHED`, enregistre le vainqueur dans la BDD via Prisma, et retourne un état de jeu cohérent à l’API.

**✅ Prompt 6 – Gestion du cube de double (doubling cube)**

> Finalise la logique du cube de double dans `src/services/rules/cubeLogic.ts` et son intégration dans `gameService.ts`. Assure-toi que les endpoints liés au cube (double, take, pass, redouble) appliquent correctement les règles de propriété du cube, de valeur et de mise à jour du match.

**✅ Prompt 7 – Règle de Crawford**

> Vérifie et complète l’implémentation de la règle de Crawford dans les matchs de tournoi (modules `matchEngine` et services de tournoi). Ajoute des tests pour garantir que le cube ne peut pas être utilisé pendant la partie Crawford et que le comportement redevient normal ensuite.

---

## Phase 2 – Intégration Frontend (React ↔ API)

**✅ Prompt 8 – Client API côté front**

> Dans `guru-react`, crée un module `src/api/client.ts` qui encapsule Axios (ou fetch) avec une baseURL pointant sur l’API backend. Ajoute un intercepteur pour ajouter automatiquement le JWT stocké dans le localStorage aux en-têtes `Authorization`. Fournis des fonctions de haut niveau pour `login`, `register`, `getGames`, `createGame`, `makeMove`, etc.

**✅ Prompt 9 – Écrans d’authentification**

> Implémente des composants `LoginForm` et `RegisterForm` dans `guru-react` (par ex. dans `src/components/auth/`). Connecte-les aux endpoints `/api/auth/login` et `/api/auth/register`. Gère les erreurs (format email invalide, mot de passe trop court, email déjà utilisé) et stocke le token JWT côté client.

**✅ Prompt 10 – Connexion WebSocket de partie**

> Crée un hook `useGameSocket` dans `guru-react` qui se connecte à `/ws/game?gameId={id}`. Il doit : gérer l’ouverture/fermeture, écouter les messages `GAME_UPDATE` et `GAME_MOVE`, mettre à jour l’état local de la partie, et exposer une fonction `sendMove` au reste de l’app.

**✅ Prompt 11 – Synchronisation état front avec backend**

> Refactorise `useBackgammon` dans `guru-react` pour ne plus simuler les coups entièrement en local, mais déléguer la validation au backend. À chaque action de l’utilisateur, envoie la demande de coup à l’API (`/api/games/:id/move`) et mets à jour l’état local avec la réponse serveur. Gère les erreurs (coup illégal, partie terminée, tour de l’adversaire).

**✅ Prompt 12 – Lobby et liste de parties**

> Ajoute une page ou une vue `Lobby` dans `guru-react` qui liste les parties disponibles (via un endpoint comme `GET /api/games?status=WAITING` ou similaire). Permets de créer une nouvelle partie et de rejoindre une partie existante via des boutons clairs.

**✅ Prompt 13 – Indicateurs visuels de dernier coup**

> Améliore le composant `GameBoard` pour pouvoir afficher le dernier coup joué (par exemple en surlignant la pointe de départ et d’arrivée). Consomme une information `lastMove` depuis l’état de jeu et adapte les classes CSS pour rendre ce feedback visuel clair.

---

## Phase 3 – IA & GNUBG

**✅ Prompt 14 – Robustesse GNUBGProvider**

> Analyse `src/providers/gnubgProvider.ts` (ou fichier équivalent) et renforce la robustesse de l’intégration : gestion des timeouts, des erreurs réseau ou de process, des retours invalides. Assure-toi qu’un crash ou blocage de GNUBG ne fasse jamais planter le serveur Express.

**✅ Prompt 15 – Endpoint de suggestions IA**

> Finalise l’endpoint `/api/games/:id/suggestions` pour qu’il retourne le meilleur coup proposé par GNUBG pour l’état actuel. Intègre la gestion de quota (`AIService` / `checkQuota`) et renvoie des erreurs 429 quand les limites sont atteintes.

**✅ Prompt 16 – Bouton de suggestion côté front**

> Dans `guru-react`, ajoute un bouton "Hint" ou "Suggestion IA" sur l’écran de partie. Quand l’utilisateur clique, appelle l’endpoint de suggestion et affiche le coup recommandé sous forme de surbrillance ou d’animation de trajectoire sur le plateau.

**✅ Prompt 17 – Bar d’évaluation (Win Probability)**

> Crée un composant `WinProbabilityBar` qui reçoit les probabilités de victoire (`whiteWinProb`, `blackWinProb`) depuis l’API `/api/games/:id/evaluate`. Affiche une barre horizontale ou un indicateur clair montrant l’avantage actuel.

**Prompt 18 – Mode "Jouer contre l’IA"** _(en attente / nécessite un refactor backend)_

> Implémente un mode de jeu contre l’IA. Lors de la création de partie, si `opponentType = 'AI'`, configure le backend pour appeler automatiquement GNUBG après chaque coup du joueur humain et jouer le coup de l’IA, en mettant à jour l’état et en notifiant le client via WebSocket ou API.
>
> **État actuel :** l’analyse du code a montré que le backend de partie (`GameService` + contrôleurs `/api/games`) est encore en transition vers le nouveau schéma Prisma (`games` / `users`) et largement stubé. L’implémentation propre du mode `AI_VS_PLAYER` nécessite un refactor backend important (aligner `GameService` sur Prisma, exposer de vraies méthodes `createGame` / `makeMove` / `getGame`, puis brancher `AIService`/GNUBG pour jouer automatiquement les coups IA et notifier le client). Le prompt est donc planifié mais **mis en attente** en attendant cette phase backend dédiée.

---

## Phase 4 – UI/UX & polish

**✅ Prompt 19 – Animations de déplacement des pions**

> Utilise `framer-motion` (déjà présent dans les dépendances) pour animer le déplacement des pions dans `GameBoard`. Les pions doivent se déplacer en glissant d’une pointe à l’autre, plutôt que de téléporter instantanément. Gère les mouvements multiples (doubles, suites de coups).

**✅ Prompt 20 – Animation des dés**

> Ajoute une animation de roulage de dés dans l’UI : quand l’utilisateur clique sur "Roll Dice", affiche une animation (rotation, shake, etc.) pendant ~1 seconde avant de montrer les valeurs finales. Assure-toi que l’état logique (backend) reste la source de vérité pour le résultat.

**✅ Prompt 21 – Responsive design du plateau**

> Améliore les feuilles de style `GameBoard` et globales pour que l’interface soit confortable sur mobile (petits écrans en mode portrait). Ajuste la taille des pions, des triangles et des marges, et vérifie que les actions principales restent facilement accessibles.

**✅ Prompt 22 – Effets sonores**

> Intègre quelques effets sonores légers (placement de pion, roulage de dés, fin de partie). Crée un petit service `soundService` côté front pour centraliser la lecture des sons et évite les doublons ou glitchs audio.

**✅ Prompt 23 – Chat en cours de partie**

> Ajoute un composant `GameChat` qui se connecte au même WebSocket de partie ou à un canal dédié. Permets l’échange de messages texte entre les deux joueurs pendant la partie, avec anti-flood simple et filtrage de base.

**Prompt 24 – Historique des coups**

> Implémente un panneau d’historique des coups affichant les mouvements en notation texte (par ex. "24/21 13/9"). Mets cet historique à jour à chaque coup, aussi bien côté front que côté backend (pour pouvoir le recharger après reconnexion).

---

## Phase 5 – DevOps, tests & sécurité

**Prompt 25 – Tests unitaires sur gameService**

> Écris ou complète une suite de tests Jest pour `src/services/gameService.ts`. Couvre au minimum : coups légaux/illégaux, prise (hit), entrée depuis la barre, bearing-off, fin de partie, et interactions de base avec les règles de match.

**Prompt 26 – Tests E2E du frontend**

> Ajoute Playwright ou Cypress au projet frontend `guru-react`. Crée un scénario de bout en bout qui couvre : inscription → connexion → création d’une partie → jouer au moins un coup → déconnexion.

**Prompt 27 – Tests de charge (load testing)**

> Crée un script de tests de charge (par ex. avec k6 ou autocannon) qui simule des dizaines de parties simultanées utilisant les endpoints critiques (`/api/games`, `/move`, WebSocket). Mesure la latence moyenne et identifie les goulets d’étranglement.

**Prompt 28 – Audit de sécurité des endpoints**

> Passe en revue les routes `/api/games`, `/api/user`, `/api/gnubg` et `/api/tournaments` pour t’assurer qu’aucun utilisateur ne peut agir au nom d’un autre. Vérifie systématiquement que `req.user.id` correspond toujours bien au joueur ou à l’utilisateur visé par l’action.

**Prompt 29 – Environnement Docker de dev**

> Configure un environnement Docker de développement unifié : un `docker-compose.yml` qui lance Postgres, le backend Express (`gurugammon-antigravity`) et éventuellement le frontend React en mode dev ou pré-build. Documente la procédure dans `DEPLOYMENT.md`.

**Prompt 30 – CI/CD (lint, tests, build)**

> Ajoute un pipeline CI (ex : GitHub Actions) qui exécute linter, tests backend, tests frontend et build (front + back) à chaque push sur la branche principale. Le pipeline doit échouer si les tests ou le lint échouent.

---

## Conseils d’utilisation

- Utilise ces prompts **un par un** ou par petits groupes (2–3) pour garder le contrôle sur les changements.
- Après chaque prompt appliqué, exécute les tests et vérifie le comportement en local.
- Garde ce fichier à jour en cochant/annotant les prompts déjà traités ou en ajoutant des variantes plus spécifiques si besoin.
