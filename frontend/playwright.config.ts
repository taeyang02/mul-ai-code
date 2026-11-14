import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const artifactDir = process.env.CI_ARTIFACT_DIR || path.join(__dirname, 'playwright-artifacts')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60000,
  outputDir: path.join(artifactDir, 'test-results'),
  reporter: [
    ['list'],
    ['junit', { outputFile: path.join(artifactDir, 'junit.xml') }],
    ['json', { outputFile: path.join(artifactDir, 'test-results.json') }],
    ['html', { outputFolder: path.join(artifactDir, 'playwright-report'), open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
          ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
        },
      },
    },
  ],
})
