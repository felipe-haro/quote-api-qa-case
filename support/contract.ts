import type { z } from 'zod';

import { contracts } from '../schemas/quote-api.schema';
import type { ApiResponse } from './quote-api-client';

/** Validates a response body against a schema and returns it typed. Fails listing every violation. */
export function expectSchema<T>(response: ApiResponse, schema: z.ZodType<T>, name: string): T {
  const body: unknown = JSON.parse(response.body);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  [${issue.path.join('.') || '$'}] ${issue.message}`).join('\n');
    throw new Error(`The response does not match the "${name}" contract:\n${issues}\n\nBody: ${response.body}`);
  }

  return parsed.data;
}

/** Validates a response body against a contract named in a feature file. */
export function expectContract(response: ApiResponse, name: string): void {
  const schema = contracts[name];
  if (!schema) {
    throw new Error(`Unknown contract "${name}". Expected one of: ${Object.keys(contracts).join(', ')}.`);
  }

  expectSchema(response, schema, name);
}
