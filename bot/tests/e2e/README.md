# Tests E2E GuruBot - Guide d'exécution

## Prérequis

Les tests E2E nécessitent que le frontend et le backend soient en cours d'exécution.

## Démarrer les serveurs

### Terminal 1 - Backend
```bash
cd d:\Downloads\PortableGit\gurugammon\gurugammon-antigravity
npm run dev
```

### Terminal 2 - Frontend
```bash
cd d:\Downloads\PortableGit\gurugammon\gurugammon-antigravity\guru-react
npm run dev
```

## Lancer les tests

### Tous les tests E2E
```bash
npx playwright test
```

### Tests GuruBot spécifiques
```bash
npx playwright test tests/e2e/gurubot_coach.spec.ts
```

### Avec interface visuelle
```bash
npx playwright test --ui
```

### Mode headed (voir le navigateur)
```bash
npx playwright test --headed
```

## Structure des tests GuruBot

### `gurubot_coach.spec.ts`

1. **GuruBot AI Coach**
   - Vérifie le branding GuruBot (pas GNUBG)
   - Crée une partie contre l'IA
   - Vérifie le bouton "Analyse GuruBot"
   - Teste l'ouverture du modal coach
   - Vérifie les résultats d'analyse

2. **GuruBot Game Level**
   - Vérifie la structure de l'état du jeu
   - Teste le lancer de dés
   - Vérifie l'affichage des pions
   - Teste l'indicateur de connexion

3. **GuruBot AI Performance**
   - Teste le temps de réponse (<10s)
   - Vérifie la stabilité WebSocket

4. **Coach Modal UI**
   - Vérifie le styling et animations
   - Teste la fermeture du modal

## Variables d'environnement

```bash
E2E_BASE_URL=http://localhost:5173
E2E_API_URL=http://localhost:3001
```

## Résolution des erreurs

### ERR_CONNECTION_REFUSED
```
Error: page.goto: net::ERR_CONNECTION_REFUSED
```
**Solution**: Démarrer le frontend avec `npm run dev` dans guru-react/

### Timeout errors
**Solution**: Augmenter le timeout dans playwright.config.ts ou la commande
```bash
npx playwright test --timeout=120000
```

---

*GuruGammon - Tests E2E Documentation*
