import { defineConfig, devices } from '@playwright/test';

if (!process.env.E2E_DATABASE_URL) {
  throw new Error(
    'Set E2E_DATABASE_URL to an isolated PostgreSQL database with a test segment in its name.',
  );
}

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
      },
    },
  ],
  webServer: [
    {
      command: 'npm run start -w @idx/api',
      url: 'http://127.0.0.1:5000/api/health',
      reuseExistingServer: false,
      env: {
        DATABASE_URL: process.env.E2E_DATABASE_URL,
        PORT: '5000',
        NODE_ENV: 'test',
        FRONTEND_ORIGINS: 'http://127.0.0.1:4173',
        LOG_LEVEL: 'silent',
      },
    },
    {
      command: 'npm run preview -w @idx/web -- --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
    },
  ],
});
