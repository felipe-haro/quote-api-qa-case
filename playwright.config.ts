import { defineConfig } from '@playwright/test';
import { cucumberReporter, defineBddConfig } from 'playwright-bdd';

import { HEALTH_PATH } from './support/quote-api-client';
import { settings } from './support/settings';

const isCI = !!process.env.CI;

/** Scenarios of an acceptance criterion the API does not meet: they fail until it is fixed. */
const KNOWN_BUG = /@known-bug/;

/** The features as living documentation: Gherkin steps, tables and the HTTP exchanges. */
const cucumberHtml = cucumberReporter('html', { outputFile: 'cucumber-report/index.html' });

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: ['steps/**/*.ts', 'support/fixtures.ts'],
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: isCI,
  // A retry is there to collect a trace, not to pass: a scenario that passes only on retry fails the CI run.
  retries: isCI ? 1 : 0,
  failOnFlakyTests: isCI,
  workers: isCI ? Number(process.env.PW_WORKERS ?? 2) : undefined,
  reporter: isCI
    ? [['blob'], ['json', { outputFile: 'results/results.json' }], ['junit', { outputFile: 'results/junit.xml' }], ['html', { open: 'never' }], cucumberHtml, ['github']]
    : [['list'], ['html', { open: 'never' }], cucumberHtml],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: settings.baseUrl,
    extraHTTPHeaders: { Accept: 'application/json' },
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
  },
  projects: [
    // The blocking run: everything that must be green.
    { name: 'api', grepInvert: KNOWN_BUG },
    // Quarantine: expected to be red until the defects are fixed. Never part of a gate.
    { name: 'known-bugs', grep: KNOWN_BUG, retries: 0 },
  ],
  // Starts the Quote API when it is not already running, and stops it after the run.
  webServer: settings.autoStartApi
    ? {
        command: 'npm run api',
        url: `${settings.baseUrl}${HEALTH_PATH}`,
        reuseExistingServer: !isCI,
        timeout: settings.startupTimeoutMs,
        env: { PORT: settings.port },
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : undefined,
});
