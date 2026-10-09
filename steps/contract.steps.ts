import { readFileSync } from 'node:fs';

import { expect } from '@playwright/test';

import { expectContract } from '../support/contract';
import { Then, When } from '../support/fixtures';
import { OPENAPI_PATH } from '../support/quote-api-client';
import { settings } from '../support/settings';

// Contract names are listed in schemas/quote-api.schema.ts.
Then('the response should match the {string} contract', async ({ state }, contract: string) => {
  expectContract(state.response, contract);
});

Then('every response should match the {string} contract', async ({ state }, contract: string) => {
  expect(state.responses.length, 'No request was sent.').toBeGreaterThan(0);
  for (const response of state.responses) {
    expectContract(response, contract);
  }
});

When('I request the published OpenAPI document', async ({ api, state }) => {
  const response = await api.getOpenApiDocument();
  expect(response.status, `${OPENAPI_PATH} answered ${response.status}.`).toBe(200);
  state.record(response);
});

// Any difference is a contract change: either the API broke the contract, or the versioned file
// must be updated (and its consumers told) in the same change.
Then('the published OpenAPI document should equal the versioned contract', async ({ state }) => {
  const versioned: unknown = JSON.parse(readFileSync(settings.contractPath, 'utf8'));
  expect(JSON.parse(state.response.body), `Versioned contract: ${settings.contractPath}`).toEqual(versioned);
});
