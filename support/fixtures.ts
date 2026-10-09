import { createBdd, test as base } from 'playwright-bdd';

import { describeExchange, QuoteApiClient } from './quote-api-client';
import { ScenarioState } from './scenario-state';

interface ScenarioFixtures {
  api: QuoteApiClient;
  state: ScenarioState;
}

export const test = base.extend<ScenarioFixtures>({
  api: async ({ request }, use, testInfo) => {
    const api = new QuoteApiClient(request);
    await use(api);

    // Evidence: every request/response of the scenario goes to the report, pass or fail.
    if (api.exchanges.length > 0) {
      await testInfo.attach('http-exchanges', {
        body: api.exchanges.map(describeExchange).join('\n\n'),
        contentType: 'text/plain',
      });
    }
  },

  state: async ({}, use) => {
    await use(new ScenarioState());
  },
});

export const { Given, When, Then } = createBdd(test);
