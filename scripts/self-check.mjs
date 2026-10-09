// Test of the tests. Exits 0 only when both checks hold:
//
// 1. Broken API: the blocking suite runs against a stub that answers every request with a useless
//    response. Every scenario must fail; one that stays green cannot fail for the right reason.
// 2. Contract drift: a contract scenario runs against a stub that answers with a correct created
//    quote (it must pass), then with the same quote changed in one detail (it must fail every time).
//
// Usage: npm run test:self-check

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const BROKEN_APIS = {
  'server error': { status: 500, contentType: 'text/plain', body: 'Internal Server Error' },
  'empty body': { status: 200, contentType: 'application/json', body: '' },
  'empty JSON object': { status: 200, contentType: 'application/json', body: '{}' },
  'HTML page': { status: 200, contentType: 'text/html', body: '<html><body>It works!</body></html>' },
};

const DRIFT_SCENARIO = 'A created quote follows the contract';

/** A correct answer to the request of DRIFT_SCENARIO. */
function createdQuote() {
  return {
    quote: {
      id: '3f2b8c1e-6d4a-4b7e-9c1d-2a5e8f7b6c4d',
      customer: 'ACME Labs',
      revision: 1,
      status: 'active',
      lines: [{ item: 'Milk', quantity: 2, unitPrice: 0.8, discount: 0, discountAmount: 0, lineTotal: 1.6 }],
      total: 1.6,
    },
    message: 'Quote created.',
  };
}

/** One change to the contract each. */
const DRIFTS = {
  'id is not a UUID': (r) => (r.quote.id = '12345'),
  'id is renamed to quoteId': (r) => ((r.quote.quoteId = r.quote.id), delete r.quote.id),
  'total is removed': (r) => delete r.quote.total,
  'total is a string': (r) => (r.quote.total = '1.60'),
  'total is null': (r) => (r.quote.total = null),
  'revision is zero': (r) => (r.quote.revision = 0),
  'status is not a known value': (r) => (r.quote.status = 'draft'),
  'status is a number instead of a name': (r) => (r.quote.status = 1),
  'customer is null': (r) => (r.quote.customer = null),
  'lines is empty': (r) => (r.quote.lines = []),
  'a line has no item name': (r) => (r.quote.lines[0].item = ''),
  'a line total is null': (r) => (r.quote.lines[0].lineTotal = null),
  'a line field is renamed': (r) => ((r.quote.lines[0].price = r.quote.lines[0].unitPrice), delete r.quote.lines[0].unitPrice),
  'a new field is added to the quote': (r) => (r.quote.currency = 'EUR'),
  'message is removed': (r) => delete r.message,
  'message is empty': (r) => (r.message = ''),
};

/** A stub answering every request with the same response, or by a function of the request path. */
function startStub(answer) {
  const server = createServer((request, response) => {
    request.resume();
    const { status, contentType, body } = typeof answer === 'function' ? answer(request.url) : answer;
    response.writeHead(status, { 'Content-Type': contentType });
    response.end(body);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const workDir = mkdtempSync(path.join(tmpdir(), 'quote-self-check-'));
let runs = 0;

/** Runs scenarios of the blocking suite against a stub and returns the Playwright JSON report. */
async function runAgainst(answer, extraArgs = '') {
  const server = await startStub(answer);
  const reportFile = path.join(workDir, `run-${++runs}.json`);

  // Not spawnSync: the stub lives in this process and must keep answering while the suite runs.
  const run = spawn(`npx playwright test --project=api --reporter=json --retries=0 ${extraArgs}`, {
    shell: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      CI: '',
      QUOTE_API_BASE_URL: `http://127.0.0.1:${server.address().port}`,
      QUOTE_API_AUTOSTART: 'false',
      PLAYWRIGHT_JSON_OUTPUT_FILE: reportFile,
    },
  });
  await new Promise((resolve) => run.on('close', resolve));
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));

  return JSON.parse(readFileSync(reportFile, 'utf8'));
}

/** Titles of the scenarios that passed, from a Playwright JSON report. */
function passedScenarios(suite, parents = []) {
  const titles = [...parents, suite.title].filter(Boolean);
  const own = (suite.specs ?? [])
    .filter((spec) => spec.tests.some((test) => test.status === 'expected' || test.status === 'flaky'))
    .map((spec) => [...titles.slice(1), spec.title].join(' › '));
  return own.concat((suite.suites ?? []).flatMap((child) => passedScenarios(child, titles)));
}

function totalOf(report) {
  return report.stats.expected + report.stats.unexpected + report.stats.flaky + report.stats.skipped;
}

let problems = 0;

console.log('1. Broken API: every scenario must fail');
for (const [name, stub] of Object.entries(BROKEN_APIS)) {
  const report = await runAgainst(stub);
  const total = totalOf(report);
  const passed = report.suites.flatMap((suite) => passedScenarios(suite));

  if (total === 0 || report.stats.skipped > 0) {
    console.error(`  FAIL  "${name}": ${total} scenarios ran, ${report.stats.skipped} skipped. The check is not valid.`);
    problems++;
  } else if (passed.length > 0) {
    console.error(`  FAIL  "${name}": ${passed.length} of ${total} scenarios stayed green:`);
    passed.forEach((title) => console.error(`          ${title}`));
    problems += passed.length;
  } else {
    console.log(`  ok    "${name}": all ${total} scenarios failed, as they must.`);
  }
}

console.log(`\n2. Contract drift: "${DRIFT_SCENARIO}" must notice every change`);

/** A healthy service whose quotes operation answers with the given body. */
const answering = (body) => (url) =>
  url === '/api/health'
    ? { status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'up', time: new Date().toISOString() }) }
    : { status: 201, contentType: 'application/json; charset=utf-8', body: JSON.stringify(body) };

const driftArgs = `--grep "${DRIFT_SCENARIO}"`;

// Control: without it, a scenario that fails for any other reason would look like a detection.
const control = await runAgainst(answering(createdQuote()), driftArgs);
if (control.stats.expected !== 1 || totalOf(control) !== 1) {
  console.error('  FAIL  control: the scenario must pass against a correct response. The check is not valid.');
  problems++;
} else {
  console.log('  ok    control: the scenario passes against a correct response.');

  for (const [name, change] of Object.entries(DRIFTS)) {
    const response = createdQuote();
    change(response);
    const report = await runAgainst(answering(response), driftArgs);

    if (report.stats.unexpected === 1 && totalOf(report) === 1) {
      console.log(`  ok    detected: ${name}`);
    } else {
      console.error(`  FAIL  not detected: ${name}`);
      problems++;
    }
  }
}

rmSync(workDir, { recursive: true, force: true });
process.exit(problems === 0 ? 0 : 1);
