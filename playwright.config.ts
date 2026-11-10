import { defineConfig, devices } from '@playwright/test'
import { join } from 'node:path'
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: 'http://localhost:4100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/startExample.mjs',
    url: 'http://localhost:4100/admin/login',
    reuseExistingServer: false,
    timeout: 180000,
    env: {
      MAIL_FIXTURE_DIR: join(process.cwd(), '.private', 'fixture'),
      PAYLOAD_CONFIG_PATH: join(process.cwd(), '.private', 'consumer', 'payload.config.ts'),
    },
  },
})
