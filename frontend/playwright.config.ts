import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against a running stack (default: docker compose on http://localhost:3000).
 * Locally, point E2E_BROWSER_PATH at an installed Chromium-based browser to skip the download;
 * CI installs Playwright's Chromium instead.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: process.env.E2E_BROWSER_PATH ? { executablePath: process.env.E2E_BROWSER_PATH } : {},
      },
    },
  ],
})
