/**
 * The contract of the API, published at GET /openapi.json.
 *
 * api/openapi.json is the versioned copy that consumers rely on. A contract scenario fails when the
 * two differ; update the copy on purpose with "npm run contract:update".
 */

const problemProperties = {
  type: { type: 'string', format: 'uri' },
  title: { type: 'string' },
  status: { type: 'integer' },
};

const itemProperties = {
  item: { type: 'string', minLength: 1 },
  quantity: { type: 'number', minimum: 0, exclusiveMinimum: true },
  unitPrice: { type: 'number', minimum: 0 },
  discount: {
    type: 'number',
    minimum: 0,
    maximum: 1,
    default: 0,
    description: 'Fraction of the gross amount: 0.10 means 10%.',
  },
};

const jsonContent = (schema: string) => ({
  'application/json': { schema: { $ref: `#/components/schemas/${schema}` } },
});

const problemContent = (schema: string) => ({
  'application/problem+json': { schema: { $ref: `#/components/schemas/${schema}` } },
});

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Quote API (study case)',
    version: '1.0.0',
    description: 'Creates price quotes. A small API with known defects, used to practise API test automation.',
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': { description: 'The service is up.', content: jsonContent('Health') },
        },
      },
    },
    '/api/quotes': {
      post: {
        summary: 'Create a quote',
        requestBody: { required: true, content: jsonContent('QuoteRequest') },
        responses: {
          '201': { description: 'The quote was created.', content: jsonContent('QuoteCreated') },
          '400': { description: 'The request is not valid.', content: problemContent('ValidationProblem') },
          '413': { description: 'The body is larger than 1 MB.', content: problemContent('Problem') },
          '415': { description: 'The content type is not JSON.', content: problemContent('Problem') },
        },
      },
    },
  },
  components: {
    schemas: {
      QuoteRequest: {
        type: 'object',
        required: ['customer', 'items'],
        additionalProperties: false,
        properties: {
          customer: { type: 'string', minLength: 1 },
          items: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/QuoteItem' } },
        },
      },
      QuoteItem: {
        type: 'object',
        required: ['item', 'quantity', 'unitPrice'],
        additionalProperties: false,
        properties: itemProperties,
      },
      QuoteCreated: {
        type: 'object',
        required: ['quote', 'message'],
        additionalProperties: false,
        properties: {
          quote: { $ref: '#/components/schemas/Quote' },
          message: { type: 'string' },
        },
      },
      Quote: {
        type: 'object',
        required: ['id', 'customer', 'revision', 'status', 'lines', 'total'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', format: 'uuid' },
          customer: { type: 'string' },
          revision: { type: 'integer', minimum: 1 },
          status: { type: 'string', enum: ['active', 'inactive'] },
          lines: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/QuoteLine' } },
          total: { type: 'number' },
        },
      },
      QuoteLine: {
        type: 'object',
        required: ['item', 'quantity', 'unitPrice', 'discount', 'discountAmount', 'lineTotal'],
        additionalProperties: false,
        properties: {
          ...itemProperties,
          discountAmount: { type: 'number' },
          lineTotal: { type: 'number' },
        },
      },
      Health: {
        type: 'object',
        required: ['status', 'time'],
        additionalProperties: false,
        properties: {
          status: { type: 'string', enum: ['up'] },
          time: { type: 'string', format: 'date-time' },
        },
      },
      Problem: {
        type: 'object',
        required: ['type', 'title', 'status'],
        properties: problemProperties,
      },
      ValidationProblem: {
        type: 'object',
        required: ['type', 'title', 'status', 'errors'],
        properties: {
          ...problemProperties,
          errors: {
            type: 'object',
            description: 'Messages by field path, for example "items[0].quantity".',
            additionalProperties: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
};
