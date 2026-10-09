import type { APIRequestContext } from '@playwright/test';

import { settings } from './settings';

export const HEALTH_PATH = '/api/health';
export const QUOTES_PATH = '/api/quotes';
export const OPENAPI_PATH = '/openapi.json';

const JSON_CONTENT_TYPE = 'application/json';

/** A snapshot of an HTTP response. The body is read immediately. */
export interface ApiResponse {
  status: number;
  /** The Content-Type header (empty when absent). */
  contentType: string;
  /** Response headers, with lower-case names. */
  headers: Record<string, string>;
  body: string;
  /** Time from sending the request to having read the whole body, as seen by the client. */
  durationMs: number;
}

/** A request/response pair, kept as evidence in the test report. */
export interface ApiExchange {
  method: string;
  url: string;
  requestContentType?: string;
  requestBody?: string;
  response: ApiResponse;
}

/** Bodies are cut in the report: a size limit scenario sends more than 1 MB. */
const MAX_LOGGED_BODY = 4000;

function cut(text: string): string {
  return text.length > MAX_LOGGED_BODY ? `${text.slice(0, MAX_LOGGED_BODY)}… (${text.length} characters)` : text;
}

export function describeExchange(exchange: ApiExchange): string {
  const lines = [`--> ${exchange.method} ${exchange.url}`];
  if (exchange.requestBody !== undefined) {
    lines.push(`    Content-Type: ${exchange.requestContentType}`, `    ${cut(exchange.requestBody)}`);
  }

  const { response } = exchange;
  lines.push(`<-- ${response.status} (${response.contentType}) in ${response.durationMs}ms`, `    ${cut(response.body)}`);
  return lines.join('\n');
}

/**
 * Client for the Quote API on top of Playwright's request context. One instance per scenario,
 * using the isolated request context Playwright creates for each test.
 */
export class QuoteApiClient {
  /** Every request/response pair sent by this client, in order. */
  readonly exchanges: ApiExchange[] = [];

  constructor(private readonly request: APIRequestContext) {}

  getHealth(): Promise<ApiResponse> {
    return this.send('GET', HEALTH_PATH);
  }

  createQuote(json: string): Promise<ApiResponse> {
    return this.send('POST', QUOTES_PATH, json, JSON_CONTENT_TYPE);
  }

  /** POST /api/quotes with any body and content type (negative tests). */
  createQuoteRaw(body: string, contentType: string): Promise<ApiResponse> {
    return this.send('POST', QUOTES_PATH, body, contentType);
  }

  /** Any method on any path (protocol tests). */
  call(method: string, path: string): Promise<ApiResponse> {
    return this.send(method, path);
  }

  getOpenApiDocument(): Promise<ApiResponse> {
    return this.send('GET', OPENAPI_PATH);
  }

  private async send(method: string, path: string, body?: string, contentType?: string): Promise<ApiResponse> {
    const startedAt = performance.now();
    const response = await this.request.fetch(path, {
      method,
      timeout: settings.requestTimeoutMs,
      // A Buffer is sent byte for byte. Playwright re-encodes a string body that is not valid
      // JSON, which would hide the malformed and empty body scenarios from the API.
      ...(body !== undefined && {
        data: Buffer.from(body, 'utf8'),
        headers: { 'Content-Type': contentType ?? JSON_CONTENT_TYPE },
      }),
    });

    const headers = response.headers();
    const captured: ApiResponse = {
      status: response.status(),
      contentType: headers['content-type'] ?? '',
      headers,
      body: await response.text(),
      durationMs: Math.round(performance.now() - startedAt),
    };
    this.exchanges.push({ method, url: response.url(), requestContentType: contentType, requestBody: body, response: captured });
    return captured;
  }
}
