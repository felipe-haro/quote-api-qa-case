import { expect } from '@playwright/test';

import { ValidationProblemSchema, type ValidationProblem } from '../schemas/quote-api.schema';
import { expectSchema } from '../support/contract';
import { Given, Then, When } from '../support/fixtures';
import { HEALTH_PATH, type ApiResponse } from '../support/quote-api-client';
import type { ScenarioState } from '../support/scenario-state';

/** The media type of a response, without parameters such as the charset. */
function mediaType(response: ApiResponse): string {
  return (response.contentType.split(';')[0] ?? '').trim().toLowerCase();
}

/** What an error response must never contain: it tells an attacker how the service is built. */
const IMPLEMENTATION_DETAILS = {
  'a stack trace': /^\s+at .+:\d+:\d+\)?$/m,
  'an error class name': /\b\w*Error: /,
  'a source file path': /[\\/][\w.-]+\.(ts|js|mjs|cjs)\b/,
  'the runtime internals': /node:internal/,
};

/** Checks a validation problem (RFC 9457) response and returns it. */
function readValidationProblem(state: ScenarioState): ValidationProblem {
  const response = state.response;
  expect(mediaType(response), `Expected a problem details body: ${response.body}`).toBe('application/problem+json');

  const problem = expectSchema(response, ValidationProblemSchema, 'validation problem');
  expect(problem.status, "Problem 'status' must match the HTTP status.").toBe(response.status);
  return problem;
}

// Precondition: the API answers its health check.
Given('the Quote API is available', async ({ api }) => {
  const response = await api.getHealth();
  expect(response.status, `Precondition failed: ${HEALTH_PATH} answered ${response.status}.`).toBe(200);
});

When('I send a {word} request to {string}', async ({ api, state }, method: string, path: string) => {
  state.record(await api.call(method, path));
});

Then('the response status code should be {int}', async ({ state }, expected: number) => {
  expect(state.response.status, `Unexpected HTTP status. Body: ${state.response.body.slice(0, 2000)}`).toBe(expected);
});

Then('every response status code should be {int}', async ({ state }, expected: number) => {
  expect(state.responses.length, 'No request was sent.').toBeGreaterThan(0);
  for (const response of state.responses) {
    expect(response.status, `Unexpected HTTP status. Body: ${response.body.slice(0, 2000)}`).toBe(expected);
  }
});

Then('the response content type should be {string}', async ({ state }, expected: string) => {
  expect(mediaType(state.response), `Content-Type header: "${state.response.contentType}"`).toBe(expected);
});

// RFC 9110, section 15.5.6: a 405 response must list the supported methods in the Allow header.
Then('the response should allow only the {word} method', async ({ state }, method: string) => {
  expect(state.response.headers['allow'], 'Allow header').toBe(method);
});

Then('the response should have no body', async ({ state }) => {
  expect(state.response.body).toBe('');
});

Then('the response should not have a {string} header', async ({ state }, header: string) => {
  expect(state.response.headers[header.toLowerCase()], `${header} header`).toBeUndefined();
});

Then('the response body should not expose implementation details', async ({ state }) => {
  const body = state.response.body;
  for (const [what, pattern] of Object.entries(IMPLEMENTATION_DETAILS)) {
    expect(body, `The response body exposes ${what}.`).not.toMatch(pattern);
  }
});

// The limits come from the performance acceptance criteria (docs/acceptance-criteria.md).
Then('the response time should be under {int} ms', async ({ state, $testInfo }, limitMs: number) => {
  const { durationMs } = state.response;
  $testInfo.annotations.push({ type: 'response time', description: `${durationMs}ms (limit ${limitMs}ms)` });
  expect(durationMs, 'Response time in ms').toBeLessThan(limitMs);
});

Then('every response time should be under {int} ms', async ({ state, $testInfo }, limitMs: number) => {
  expect(state.responses.length, 'No request was sent.').toBeGreaterThan(0);
  const slowest = Math.max(...state.responses.map((response) => response.durationMs));
  $testInfo.annotations.push({ type: 'slowest response time', description: `${slowest}ms (limit ${limitMs}ms)` });
  expect(slowest, 'Slowest response time in ms').toBeLessThan(limitMs);
});

Then('the response should be a validation problem', async ({ state }) => {
  readValidationProblem(state);
});

// The field is looked for in the paths of the errors, for example "items[0].quantity".
Then('the response should be a validation problem mentioning {string}', async ({ state }, field: string) => {
  const { errors } = readValidationProblem(state);
  const needle = field.toLowerCase();
  const mentioned = Object.keys(errors).some((name) => name.toLowerCase().includes(needle));
  expect(mentioned, `The validation errors do not mention '${field}': ${JSON.stringify(errors)}`).toBe(true);
});
