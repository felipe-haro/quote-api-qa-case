import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { openApiDocument } from './openapi';
import { createQuote } from './quotes';
import { parseQuoteRequest, type FieldErrors } from './validation';

const JSON_TYPE = 'application/json; charset=utf-8';
const PROBLEM_TYPE = 'application/problem+json; charset=utf-8';

/** application/json and any application/*+json. */
const JSON_MEDIA_TYPE = /^application\/([\w.-]+\+)?json$/;

type Handler = (request: IncomingMessage, response: ServerResponse) => Promise<void> | void;

function send(response: ServerResponse, status: number, contentType: string, body: unknown): void {
  response.writeHead(status, { 'Content-Type': contentType });
  response.end(JSON.stringify(body));
}

/** RFC 9457 problem details. */
function sendProblem(response: ServerResponse, status: number, title: string, errors?: FieldErrors): void {
  send(response, status, PROBLEM_TYPE, {
    type: `https://www.rfc-editor.org/rfc/rfc9110#status.${status}`,
    title,
    status,
    ...(errors && { errors }),
  });
}

function sendInvalid(response: ServerResponse, errors: FieldErrors): void {
  sendProblem(response, 400, 'The request is not valid.', errors);
}

/** KNOWN DEFECT (AC-27): the body is read whole, whatever its size. The contract says 1 MB. */
async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
}

const health: Handler = (_request, response) => {
  send(response, 200, JSON_TYPE, { status: 'up', time: new Date().toISOString() });
};

const openApi: Handler = (_request, response) => {
  send(response, 200, JSON_TYPE, openApiDocument);
};

const postQuote: Handler = async (request, response) => {
  const text = await readBody(request);

  const mediaType = (request.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase();
  if (!JSON_MEDIA_TYPE.test(mediaType)) {
    sendProblem(response, 415, 'The content type is not supported. Send application/json.');
    return;
  }

  if (text.trim() === '') {
    sendInvalid(response, { $: ['A request body is required.'] });
    return;
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    sendInvalid(response, { $: ['The body is not valid JSON.'] });
    return;
  }

  const parsed = parseQuoteRequest(body);
  if ('errors' in parsed) {
    sendInvalid(response, parsed.errors);
    return;
  }

  send(response, 201, JSON_TYPE, { quote: createQuote(parsed.request), message: 'Quote created.' });
};

const routes: Record<string, Record<string, Handler>> = {
  '/api/health': { GET: health },
  '/api/quotes': { POST: postQuote },
  '/openapi.json': { GET: openApi },
};

export function createApp(): Server {
  return createServer(async (request, response) => {
    // KNOWN DEFECT (AC-28): every response names the software that produced it.
    response.setHeader('X-Powered-By', `quote-api-study/1.0 (Node.js ${process.version})`);

    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    const route = routes[path];
    if (!route) {
      request.resume();
      response.writeHead(404).end();
      return;
    }

    const handler = route[request.method ?? ''];
    if (!handler) {
      request.resume();
      response.writeHead(405, { Allow: Object.keys(route).join(', ') }).end();
      return;
    }

    try {
      await handler(request, response);
    } catch (error) {
      // KNOWN DEFECT (AC-25): an unexpected error is answered with its stack trace.
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(error instanceof Error ? error.stack : String(error));
    }
  });
}
