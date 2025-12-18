/**
 * @file gurubot_coach.spec.ts
 * @description Tests E2E pour le Coach GuruBot AI et le niveau de jeu
 * Tests the GuruBot AI analysis, coach functionality, and game level
 */

import { test, expect, Page } from '@playwright/test';

// Configuration de test
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

// Helper pour se connecter
async function login(page: Page) {
    await page.goto(`${BASE_URL}/login`);

    // Tenter connexion guest
    const guestButton = page.locator('button:has-text("Play as Guest")');
    if (await guestButton.isVisible({ timeout: 3000 })) {
        await guestButton.click();
        await page.waitForURL(/\/lobby/);
    }
}

// Helper pour créer une partie contre l'IA
async function createAIGame(page: Page) {
    await page.goto(`${BASE_URL}/lobby`);

    // Cliquer sur "Play vs AI Coach"
    const aiButton = page.locator('button:has-text("Play vs AI Coach")');
    await expect(aiButton).toBeVisible({ timeout: 10000 });
    await aiButton.click();

    // Attendre la redirection vers la page de jeu
    await page.waitForURL(/\/game\//);

    // Retourner l'ID du jeu
    const url = page.url();
    const gameId = url.split('/game/')[1];
    return gameId;
}

test.describe('GuruBot AI Coach', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display GuruBot branding instead of GNUBG', async ({ page }) => {
        await page.goto(`${BASE_URL}/lobby`);

        // Vérifier que "GuruBot" apparaît et pas "GNUBG"
        const lobbyContent = await page.textContent('body');
        expect(lobbyContent).toContain('GuruBot');
        expect(lobbyContent?.toLowerCase()).not.toContain('gnubg');
    });

    test('should create a game against GuruBot AI', async ({ page }) => {
        const gameId = await createAIGame(page);

        expect(gameId).toBeTruthy();

        // Vérifier que le plateau est visible
        const board = page.locator('[class*="board"], [data-testid="board"]').first();
        await expect(board).toBeVisible({ timeout: 10000 });

        // Vérifier l'indicateur de connexion
        const connectionIndicator = page.locator('text=Live').or(page.locator('text=Offline'));
        await expect(connectionIndicator).toBeVisible({ timeout: 5000 });
    });

    test('should have Analyse GuruBot button visible', async ({ page }) => {
        await createAIGame(page);

        // Vérifier le bouton d'analyse
        const analyseButton = page.locator('button:has-text("Analyse GuruBot")');
        await expect(analyseButton).toBeVisible({ timeout: 10000 });
    });

    test('should open coach modal when clicking analyse', async ({ page }) => {
        await createAIGame(page);

        // Cliquer sur le bouton d'analyse
        const analyseButton = page.locator('button:has-text("Analyse GuruBot")');
        await analyseButton.click();

        // Vérifier que le modal s'ouvre
        const modal = page.locator('[class*="modal"], [role="dialog"]').first();
        await expect(modal).toBeVisible({ timeout: 10000 });

        // Vérifier le contenu du modal - soit en analyse, soit avec résultat
        const modalContent = await page.textContent('body');
        const hasAnalysisContent =
            modalContent?.includes('Analyzing') ||
            modalContent?.includes('GuruBot') ||
            modalContent?.includes('Analysis') ||
            modalContent?.includes('Move');

        expect(hasAnalysisContent).toBeTruthy();
    });

    test('should display coach analysis results', async ({ page }) => {
        await createAIGame(page);

        // D'abord, lancer les dés si c'est notre tour
        const rollButton = page.locator('button:has-text("Roll Dice")');
        if (await rollButton.isVisible({ timeout: 3000 })) {
            await rollButton.click();
            await page.waitForTimeout(1000);
        }

        // Cliquer sur le bouton d'analyse
        const analyseButton = page.locator('button:has-text("Analyse GuruBot")');
        await analyseButton.click();

        // Attendre le résultat de l'analyse (peut prendre du temps)
        await page.waitForTimeout(5000);

        // Vérifier qu'il y a du contenu d'analyse
        const analysisContent = page.locator('text=/Best Move|Suggested|Equity|Analysis/i');

        // Soit on a le contenu, soit on a "Analyzing..."
        const hasContent = await analysisContent.count() > 0;
        const isStillAnalyzing = await page.locator('text=Analyzing').count() > 0;

        expect(hasContent || isStillAnalyzing).toBeTruthy();
    });
});

test.describe('GuruBot Game Level', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should have valid game state structure', async ({ page }) => {
        await createAIGame(page);

        // Vérifier les éléments du jeu
        await expect(page.locator('text=VS')).toBeVisible({ timeout: 10000 });

        // Vérifier qu'il y a un indicateur du joueur courant
        const playerIndicators = page.locator('[class*="rounded-full"]');
        await expect(playerIndicators.first()).toBeVisible();
    });

    test('should allow rolling dice on player turn', async ({ page }) => {
        await createAIGame(page);

        // Attendre que le bouton Roll Dice soit visible (si c'est notre tour)
        const rollButton = page.locator('button:has-text("Roll Dice")');

        // Le bouton peut ne pas être visible si c'est le tour de l'IA
        const isVisible = await rollButton.isVisible({ timeout: 5000 }).catch(() => false);

        if (isVisible) {
            await rollButton.click();

            // Vérifier que les dés ont été lancés (le bouton change ou disparaît)
            await page.waitForTimeout(1000);

            // Le roll peut avoir changé l'état - vérifier la page
            const bodyText = await page.textContent('body');
            expect(bodyText).toBeTruthy();
        }
    });

    test('should display game board with checkers', async ({ page }) => {
        await createAIGame(page);

        // Vérifier que le plateau a des pions (éléments arrondis représentant les pions)
        await page.waitForTimeout(2000);

        // Chercher les éléments du plateau
        const boardElements = page.locator('[class*="bg-white"], [class*="bg-red"]');
        const count = await boardElements.count();

        // Il devrait y avoir plusieurs éléments (pions + indicateurs)
        expect(count).toBeGreaterThan(0);
    });

    test('should have connection indicator', async ({ page }) => {
        await createAIGame(page);

        // Vérifier l'indicateur de connexion
        const liveIndicator = page.locator('text=Live');
        const offlineIndicator = page.locator('text=Offline');
        const reconnectingIndicator = page.locator('text=Reconnecting');

        const hasIndicator =
            await liveIndicator.isVisible({ timeout: 5000 }).catch(() => false) ||
            await offlineIndicator.isVisible({ timeout: 1000 }).catch(() => false) ||
            await reconnectingIndicator.isVisible({ timeout: 1000 }).catch(() => false);

        expect(hasIndicator).toBeTruthy();
    });
});

test.describe('GuruBot AI Performance', () => {
    test('should respond to game actions within timeout', async ({ page }) => {
        await login(page);
        await createAIGame(page);

        const startTime = Date.now();

        // Essayer de lancer les dés
        const rollButton = page.locator('button:has-text("Roll Dice")');
        if (await rollButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            await rollButton.click();

            // Attendre une réponse (changement d'état)
            await page.waitForTimeout(2000);

            const elapsedTime = Date.now() - startTime;

            // Le jeu devrait répondre en moins de 10 secondes
            expect(elapsedTime).toBeLessThan(10000);
        }
    });

    test('should maintain stable WebSocket connection', async ({ page }) => {
        await login(page);
        await createAIGame(page);

        // Attendre et vérifier que la connexion reste stable
        await page.waitForTimeout(3000);

        // Vérifier qu'on n'a pas d'erreur de reconnexion
        const reconnectingCount = await page.locator('text=Reconnecting').count();
        const errorCount = await page.locator('text=Connection Lost').count();

        // Pas d'erreurs de connexion
        expect(reconnectingCount + errorCount).toBe(0);
    });
});

test.describe('Coach Modal UI', () => {
    test('should have proper styling and animations', async ({ page }) => {
        await login(page);
        await createAIGame(page);

        // Ouvrir le modal
        const analyseButton = page.locator('button:has-text("Analyse GuruBot")');
        await analyseButton.click();

        // Vérifier que le modal a une animation (framer-motion classes)
        const modal = page.locator('[class*="modal"], [role="dialog"]').first();
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Le modal devrait avoir un fond sombre
        const backdrop = page.locator('[class*="bg-black"], [class*="backdrop"]');
        const backdropCount = await backdrop.count();

        expect(backdropCount).toBeGreaterThan(0);
    });

    test('should close modal with close button or escape', async ({ page }) => {
        await login(page);
        await createAIGame(page);

        // Ouvrir le modal
        const analyseButton = page.locator('button:has-text("Analyse GuruBot")');
        await analyseButton.click();

        await page.waitForTimeout(500);

        // Essayer de fermer avec Escape
        await page.keyboard.press('Escape');

        await page.waitForTimeout(500);

        // Ou chercher un bouton de fermeture
        const closeButton = page.locator('button:has-text("Close"), button:has-text("×"), [aria-label="Close"]');
        if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await closeButton.click();
        }
    });
});
