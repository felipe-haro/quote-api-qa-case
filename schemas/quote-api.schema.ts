import { z } from 'zod';

/**
 * Consumer contract of the Quote API responses, written from the contract of the API
 * (api/openapi.json). A change here is a contract change and must be reviewed as one.
 *
 * Objects owned by the API are strict: a renamed, removed or added field fails the contract test.
 * Errors follow RFC 9457 problem details, which allows extension members.
 */

export const QuoteLineSchema = z.strictObject({
  item: z.string().min(1),
  quantity: z.number(),
  unitPrice: z.number(),
  discount: z.number(),
  discountAmount: z.number(),
  lineTotal: z.number(),
});

export const QuoteSchema = z.strictObject({
  id: z.uuid(),
  customer: z.string().min(1),
  revision: z.number().int().positive(),
  status: z.enum(['active', 'inactive']),
  lines: z.array(QuoteLineSchema).min(1),
  total: z.number(),
});

/** 201: the quote and a confirmation message. */
export const CreatedQuoteSchema = z.strictObject({
  quote: QuoteSchema,
  message: z.string().min(1),
});

/** RFC 9457 problem details. */
export const ProblemDetailsSchema = z.object({
  type: z.url(),
  title: z.string().min(1),
  status: z.number().int().min(400).max(599),
});

/** Problem details of a refused request: lists the offending fields. */
export const ValidationProblemSchema = ProblemDetailsSchema.extend({
  status: z.literal(400),
  errors: z
    .record(z.string(), z.array(z.string().min(1)).min(1))
    .refine((errors) => Object.keys(errors).length > 0, 'At least one field error is expected.'),
});

/** GET /api/health: the service is up, with the server time in ISO 8601. */
export const HealthSchema = z.strictObject({
  status: z.literal('up'),
  time: z.iso.datetime({ offset: true }),
});

export type Quote = z.infer<typeof QuoteSchema>;
export type CreateQuoteResponse = z.infer<typeof CreatedQuoteSchema>;
export type ValidationProblem = z.infer<typeof ValidationProblemSchema>;
export type Health = z.infer<typeof HealthSchema>;

/** Contracts by the name used in the feature files. */
export const contracts: Record<string, z.ZodType> = {
  'created quote': CreatedQuoteSchema,
  'problem details': ProblemDetailsSchema,
  'validation problem': ValidationProblemSchema,
  health: HealthSchema,
};
