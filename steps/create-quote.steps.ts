import { expect } from '@playwright/test';
import Decimal from 'decimal.js';
import type { DataTable } from 'playwright-bdd';

import { Given, Then, When } from '../support/fixtures';
import { ScenarioState } from '../support/scenario-state';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Compares a number of the response with the value written in the feature file, as exact decimals
 * (no binary floating point tolerance: "1.60" equals 1.6, and 3.495 must be exactly 3.495).
 */
function expectDecimal(actual: number, expected: string, message: string): void {
  expect(new Decimal(actual).toString(), message).toBe(new Decimal(expected.trim()).toString());
}

// ---------- Given ----------

// The customer can also be [omitted] / [null] / [empty] / [blank].
Given('a quote request for customer {string}', async ({ state }, customer: string) => {
  state.request.withCustomer(customer);
});

Given('a quote request for a customer with a name of {int} characters', async ({ state }, length: number) => {
  state.request.withCustomerOfLength(length);
});

// Columns: Item, Quantity, UnitPrice and optional Discount.
Given('the request contains the following items:', async ({ state }, items: DataTable) => {
  for (const row of items.hashes()) {
    state.request.addItem(row.Item ?? '', row.Quantity ?? '', row.UnitPrice ?? '', row.Discount);
  }
});

// A large quote: the same item repeated.
Given(
  'the request contains {int} items of {string} with quantity {word} and unit price {word}',
  async ({ state }, count: number, item: string, quantity: string, unitPrice: string) => {
    for (let i = 0; i < count; i++) {
      state.request.addItem(item, quantity, unitPrice);
    }
  },
);

Given('the request contains no items', async ({ state }) => {
  state.request.withNoItems();
});

Given('the request does not include the items field', async ({ state }) => {
  state.request.withoutItemsField();
});

Given('the request items field is null', async ({ state }) => {
  state.request.withNullItems();
});

// ---------- When ----------

When('I submit the quote request', async ({ api, state }) => {
  state.record(await api.createQuote(state.request.toJson()));
});

When('I submit the quote request {int} times', async ({ api, state }, times: number) => {
  const body = state.request.toJson();
  for (let i = 0; i < times; i++) {
    state.record(await api.createQuote(body));
  }
});

When('I submit the quote request {int} times concurrently', async ({ api, state }, times: number) => {
  const body = state.request.toJson();
  const responses = await Promise.all(Array.from({ length: times }, () => api.createQuote(body)));
  responses.forEach((response) => state.record(response));
});

When('I submit an empty body with content type {string}', async ({ api, state }, contentType: string) => {
  state.record(await api.createQuoteRaw('', contentType));
});

When('I submit the following raw body with content type {string}:', async ({ api, state }, contentType: string, body: string) => {
  state.record(await api.createQuoteRaw(body, contentType));
});

// ---------- Then ----------

Then('the confirmation message should be {string}', async ({ state }, message: string) => {
  expect(state.getCreateQuoteResponse().message).toBe(message);
});

Then('the quote should belong to customer {string}', async ({ state }, customer: string) => {
  expect(state.getQuote().customer).toBe(customer);
});

Then('the quote should have a unique identifier', async ({ state }) => {
  const id = state.getQuote().id;
  expect(id, 'The quote identifier must be a GUID.').toMatch(GUID_PATTERN);
  expect(id, 'The quote identifier must not be an empty GUID.').not.toBe(EMPTY_GUID);
});

Then('the quote should be at revision {int} with status {string}', async ({ state }, revision: number, status: string) => {
  const quote = state.getQuote();
  expect(quote.revision, 'Quote revision').toBe(revision);
  expect(quote.status, 'Quote status').toBe(status);
});

Then('the quote should contain {int} lines', async ({ state }, count: number) => {
  expect(state.getQuote().lines.length, 'Number of quote lines').toBe(count);
});

// Compares every quote line, in order, with the expected table.
Then('the quote should contain the following lines:', async ({ state }, expectedLines: DataTable) => {
  const lines = state.getQuote().lines;
  const expected = expectedLines.hashes();
  expect(lines.length, 'Number of quote lines').toBe(expected.length);

  expected.forEach((row, i) => {
    const line = lines[i]!;
    const at = `Line ${i + 1} (${row.Item})`;

    expect(line.item, `${at}: Item`).toBe(row.Item);
    expectDecimal(line.quantity, row.Quantity!, `${at}: Quantity`);
    expectDecimal(line.unitPrice, row.UnitPrice!, `${at}: UnitPrice`);
    expectDecimal(line.discount, row.Discount!, `${at}: Discount`);
    expectDecimal(line.discountAmount, row.DiscountAmount!, `${at}: DiscountAmount`);
    expectDecimal(line.lineTotal, row.LineTotal!, `${at}: LineTotal`);
  });
});

Then(/^the quote total should be (-?\d+(?:\.\d+)?)$/, async ({ state }, total: string) => {
  expectDecimal(state.getQuote().total, total, 'Quote total');
});

// Invariant: the total is the sum of the line totals (summed as decimals, not as binary floats).
Then('the quote total should equal the sum of its line totals', async ({ state }) => {
  const quote = state.getQuote();
  const sum = quote.lines.reduce((acc, line) => acc.plus(line.lineTotal), new Decimal(0));
  expectDecimal(quote.total, sum.toString(), 'The total must be the sum of the line totals');
});

Then('every created quote should have a distinct identifier', async ({ state }) => {
  const ids = state.responses.map((r) => ScenarioState.readCreateQuoteResponse(r).quote?.id ?? EMPTY_GUID);

  expect(ids.length, 'At least two quotes are needed to compare identifiers.').toBeGreaterThan(1);
  expect(ids, 'Every response must contain a quote with an identifier.').not.toContain(EMPTY_GUID);
  expect(new Set(ids).size, 'Quote identifiers must be unique.').toBe(ids.length);
});
