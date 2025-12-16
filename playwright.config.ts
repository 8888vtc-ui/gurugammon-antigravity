import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 60000, // 60s global timeout per test
    expect: {
        timeout: 10000 // 10s expect timeout
    },
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 1, // Retry once locally too
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        actionTimeout: 15000,
        baseURL: 'http://localhost:5173', // Correcting to active port
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
