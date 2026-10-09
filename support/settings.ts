import { existsSync } from 'node:fs';
import path from 'node:path';

// Optional local overrides (see .env.example). Variables already set in the environment win.
const envFile = path.resolve(__dirname, '..', '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function envInt(name: string, fallback: number): number {
  const value = env(name);
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${name} must be an integer, got "${value}".`);
  }

  return parsed;
}

const baseUrl = new URL(env('QUOTE_API_BASE_URL') ?? 'http://localhost:3000');

/** Runtime settings of the acceptance suite, resolved once from environment variables. */
export const settings = {
  /** Quote API under test (QUOTE_API_BASE_URL). */
  baseUrl: baseUrl.origin,

  /** Port the API is started on when the suite starts it. */
  port: baseUrl.port || '80',

  /** Start the API from api/ when it is not reachable (QUOTE_API_AUTOSTART). */
  autoStartApi: env('QUOTE_API_AUTOSTART')?.toLowerCase() !== 'false',

  /** Versioned OpenAPI contract the published one is compared with (QUOTE_API_CONTRACT). */
  contractPath: env('QUOTE_API_CONTRACT') ?? path.resolve(__dirname, '..', 'api', 'openapi.json'),

  /** Max wait for the health check after an auto start (QUOTE_API_STARTUP_TIMEOUT_SECONDS). */
  startupTimeoutMs: envInt('QUOTE_API_STARTUP_TIMEOUT_SECONDS', 30) * 1000,

  /** Timeout of one HTTP request (QUOTE_API_REQUEST_TIMEOUT_MS). */
  requestTimeoutMs: envInt('QUOTE_API_REQUEST_TIMEOUT_MS', 10_000),
};
