
const { chromium } = require('playwright');

(async () => {
    console.log('🤖 Starting GuruGammon Bot (Edge Edition)...');

    // Launch Microsoft Edge
    const browser = await chromium.launch({
        channel: 'msedge',
        headless: true // Set to false if you want to see the window (might fail in automation env)
    });

    console.log('✅ Browser Launched.');
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // 1. Visit Site
        const baseUrl = 'https://gurugammon-react.netlify.app';
        console.log(`🌐 Navigating to ${baseUrl}...`);
        await page.goto(baseUrl);
        console.log(`PAGE TITLE: ${await page.title()}`);

        // Check for Landing Page
        const startBtn = page.getByText('Play Now');
        if (await startBtn.isVisible()) {
            console.log('🏠 Found Landing Page. Clicking "Play Now"...');
            await startBtn.click();
            await page.waitForTimeout(1000); // Wait for nav
        }

        // Handle Login / Redirect
        // If we are at /lobby (cached token), good. If at /login, we need to login.
        // Debug: Log current state
        console.log(`Current URL: ${page.url()}`);
        // Wait for body to be ready
        await page.waitForSelector('body');

        if (page.url().includes('/login') || (await page.getByRole('heading', { name: 'GuruGammon' }).isVisible()) || (await page.getByText('Play as Guest').isVisible())) {
            console.log('🔑 Seeing Login Screen.');
            // Click "Play as Guest"
            const guestBtn = page.getByRole('button', { name: 'Play as Guest' }); // More specific locator
            if (await guestBtn.isVisible()) {
                console.log('👆 Clicking "Play as Guest"...');
                await guestBtn.click();
            } else {
                // Try text locator as fallback
                await page.getByText('Play as Guest').click();
            }
        } else {
            console.log('⚠️ Login screen verification skipped. Maybe already logged in? Or Page Blank?');
            console.log('Page Text Snapshot:');
            console.log((await page.locator('body').innerText()).substring(0, 500));
        }

        // 2. Wait for Lobby
        console.log('⏳ Waiting for Lobby (Strict Check)...');
        // Wait for URL to be exactly /lobby (ignoring domain)
        await page.waitForURL(url => url.pathname === '/lobby', { timeout: 15000 });
        console.log('✅ Lobby Reached (Confirmed).');

        // 3. Start Game
        console.log('🎲 Starting "Play vs AI Coach"...');
        const playAiBtn = page.getByText('Play vs AI Coach');
        if (await playAiBtn.isVisible()) {
            await playAiBtn.click();
        } else {
            console.log('❌ Could not find AI Coach button. Dumping page text:');
            console.log((await page.locator('body').innerText()).substring(0, 500));
            throw new Error('AI Coach button not accessible!');
        }

        // 4. Wait for Game Room
        console.log('⏳ Connecting to Game...');
        await page.waitForURL('**/game/*', { timeout: 15000 });
        console.log(`✅ Game Started! URL: ${page.url()}`);

        // 5. Interact
        // Check for "Roll Dice" button.
        // It might take a moment if WebSocket is connecting.
        const rollBtn = page.getByText('Roll Dice');

        try {
            await rollBtn.waitFor({ state: 'visible', timeout: 10000 });
            console.log('🎲 "Roll Dice" button appeared.');
            await rollBtn.click();
            console.log('👆 Clicked "Roll Dice".');

            // Wait a bit to ensure action is processed
            await page.waitForTimeout(2000);

            // Check if button text changed or disabled
            // If text becomes "Rolling...", or buttons disappear
            const btnText = await rollBtn.innerText();
            // Note: if rolling, text might be 'Rolling...'
            console.log(`Button state after click: "${btnText}"`);

            console.log('✅ TEST PASSED: Game started and interaction successful.');

        } catch (e) {
            console.log('⚠️ Could not click Roll Dice (Maybe it\'s AI\'s turn? or Socket Error?)');
            console.log('Checking for error messages...');
            // Check for potential error toasts
            const errorMsg = await page.getByText('Error').or(page.getByText('Failed')).first();
            if (await errorMsg.isVisible()) {
                console.log(`❌ Found Error on screen: ${await errorMsg.innerText()}`);
            }
        }

    } catch (error) {
        console.error('❌ BOT FAILED:', error);
    } finally {
        await browser.close();
        console.log('🤖 Bot Finished.');
    }
})();
