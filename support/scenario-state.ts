import { expect } from '@playwright/test';

import type { CreateQuoteResponse, Quote } from '../schemas/quote-api.schema';
import type { ApiResponse } from './quote-api-client';
import { QuoteRequestBuilder } from './quote-request-builder';

/** State shared by the step definitions of one scenario. */
export class ScenarioState {
  /** The request being built by the Given steps. */
  readonly request = new QuoteRequestBuilder();

  /** Every response received in this scenario, in order. */
  readonly responses: ApiResponse[] = [];

  /** The last response. Fails when no request was sent. */
  get response(): ApiResponse {
    const last = this.responses.at(-1);
    if (!last) {
      throw new Error('No HTTP request was sent in this scenario yet.');
    }

    return last;
  }

  record(response: ApiResponse): void {
    this.responses.push(response);
  }

  /** Reads a response as a create quote response, asserting it is JSON. */
  static readCreateQuoteResponse(response: ApiResponse): CreateQuoteResponse {
    expect(response.contentType, 'Create quote response must be JSON.').toContain('application/json');
    return JSON.parse(response.body) as CreateQuoteResponse;
  }

  getCreateQuoteResponse(): CreateQuoteResponse {
    return ScenarioState.readCreateQuoteResponse(this.response);
  }

  /** The quote of the last response, asserting it exists. */
  getQuote(): Quote {
    const quote = this.getCreateQuoteResponse().quote;
    expect(quote, `A quote was expected in the response: ${this.response.body}`).toBeTruthy();
    return quote as Quote;
  }
}
