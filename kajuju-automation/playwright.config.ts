import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// Live site by default so a fresh checkout and CI work with no setup.
// Override with BASE_URL (shell or .env) to point the suite somewhere else.
const DEFAULT_BASE_URL = 'https://kajuju-automation.vercel.app';
const baseURL = (process.env.BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

const isCI = !!process.env.CI;

export default defineConfig({
  forbidOnly: isCI,
  fullyParallel: true,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      // Read-only checks of the public site. Third-party writes are blocked in tests/e2e/fixtures.ts.
      name: 'e2e',
      testDir: './tests/e2e',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Price checks against the gitignored CSVs in rates-reference/. Not run in CI: the CSVs are not in the
      // repository, and the project fails with a clear message if the folder is missing.
      name: 'rates',
      testDir: './tests/rates',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Read-only uptime checks used by the scheduled availability-monitor workflow.
      name: 'monitoring',
      testDir: './tests/monitoring',
      testMatch: 'health-check.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
