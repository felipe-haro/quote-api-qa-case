// Runs every scenario (blocking suite + quarantine) and saves screenshots of the reports to
// docs/images, to be used in the documentation.
//
// It drives a browser already installed on the machine (no "playwright install"):
// REPORT_BROWSER=chrome (default) or msedge.
//
// Usage: npm run docs:screenshots

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs', 'images');
const playwrightReport = path.join(root, 'playwright-report', 'index.html');
const cucumberReport = path.join(root, 'cucumber-report', 'index.html');

// The exit code is not checked: the quarantined scenarios are expected to fail.
const run = spawn('npx playwright test', { cwd: root, shell: true, stdio: 'inherit', env: { ...process.env, CI: '' } });
await new Promise((resolve) => run.on('close', resolve));

for (const report of [playwrightReport, cucumberReport]) {
  if (!existsSync(report)) {
    throw new Error(`Report not found: ${report}`);
  }
}

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: process.env.REPORT_BROWSER ?? 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

async function shot(name, options = {}) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, animations: 'disabled', ...options });
  console.log(`saved ${path.relative(root, file)}`);
}

const playwrightUrl = pathToFileURL(playwrightReport).href;

// Playwright report: summary of the whole run.
await page.goto(playwrightUrl);
await page.getByText('Create a quote for a customer with a single item').first().waitFor();
await shot('playwright-report-overview');

// Playwright report: the quarantined defects.
await page.goto(`${playwrightUrl}#?q=s:failed`);
const knownBug = page.getByRole('link', { name: /Reject a quote request with a null entry in the item list/ }).first();
await knownBug.waitFor();
await shot('playwright-report-known-bugs');

// Playwright report: one defect, with the Gherkin steps, the error and the HTTP exchange.
await knownBug.click();
await page.getByText('Expected: 400').first().waitFor();
// The stack traces carry the absolute path of the machine that ran the suite: show them relative
// to the repository instead.
await page.evaluate((prefixes) => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    for (const prefix of prefixes) {
      walker.currentNode.nodeValue = walker.currentNode.nodeValue.replaceAll(prefix, '');
    }
  }
}, [`${root}${path.sep}`, `${root.split(path.sep).join('/')}/`]);
await shot('playwright-report-known-bug-detail', { fullPage: true });

// Playwright report: the contract scenarios.
await page.goto(`${playwrightUrl}#?q=@contract`);
await page.getByText('A created quote follows the contract').first().waitFor();
await shot('playwright-report-contract');

// Cucumber report: the features as living documentation.
await page.goto(pathToFileURL(cucumberReport).href);
await page.getByText('Create a quote', { exact: false }).first().waitFor();
await shot('cucumber-report-overview');

await browser.close();
