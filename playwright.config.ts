import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const chromium =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: {
    headless: true,
    launchOptions: { executablePath: chromium, args: ['--no-sandbox', '--disable-dev-shm-usage'] },
    viewport: { width: 1440, height: 1100 },
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'munkafolyamat', testMatch: 'flow.spec.ts', use: { baseURL: 'http://127.0.0.1:5175' } },
    { name: 'hitelesites', testMatch: 'auth.spec.ts', use: { baseURL: 'http://127.0.0.1:5174' } },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 5175',
      url: 'http://127.0.0.1:5175',
      reuseExistingServer: false,
      env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    },
    {
      command: 'npm run dev -- --port 5174',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      env: {
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        VITE_SUPABASE_ANON_KEY: 'test-only-public-key',
      },
    },
  ],
});
