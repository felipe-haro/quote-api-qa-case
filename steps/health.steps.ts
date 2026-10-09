import { expect } from '@playwright/test';

import { HealthSchema } from '../schemas/quote-api.schema';
import { expectSchema } from '../support/contract';
import { Then, When } from '../support/fixtures';

/** Accepted difference between the server clock and the test machine clock. */
const CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

When('I check the health of the service', async ({ api, state }) => {
  state.record(await api.getHealth());
});

Then('the service should report the status {string}', async ({ state }, status: string) => {
  expect(expectSchema(state.response, HealthSchema, 'health').status).toBe(status);
});

Then('the service should report the current date and time', async ({ state }) => {
  const { time } = expectSchema(state.response, HealthSchema, 'health');

  const driftMs = Math.abs(new Date(time).getTime() - Date.now());
  expect(driftMs, `Server time ${time} is ${driftMs}ms away from the test machine clock.`).toBeLessThanOrEqual(CLOCK_TOLERANCE_MS);
});
