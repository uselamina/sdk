import type { LaminaErrorBody } from './types.js';

export class LaminaError extends Error {
  status: number;
  body: unknown;
  headers: Headers;

  constructor(message: string, options: { status: number; body: unknown; headers: Headers }) {
    super(message);
    this.name = 'LaminaError';
    this.status = options.status;
    this.body = options.body;
    this.headers = options.headers;
  }
}

export class LaminaAuthError extends LaminaError {
  constructor(message: string, options: { status: number; body: unknown; headers: Headers }) {
    super(message, options);
    this.name = 'LaminaAuthError';
  }
}

export class LaminaRateLimitError extends LaminaError {
  retryAfterSeconds: number | null;

  constructor(message: string, options: { status: number; body: unknown; headers: Headers }) {
    super(message, options);
    this.name = 'LaminaRateLimitError';
    const retryAfter = options.headers.get('Retry-After');
    this.retryAfterSeconds = retryAfter ? Number.parseInt(retryAfter, 10) || null : null;
  }
}

function extractMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') {
    return fallback;
  }

  const maybeBody = body as LaminaErrorBody;
  if (typeof maybeBody.error === 'string' && maybeBody.error.trim()) {
    return maybeBody.error;
  }

  return fallback;
}

export function createLaminaError(
  status: number,
  headers: Headers,
  body: unknown
): LaminaError {
  const message = extractMessage(body, `Lamina request failed with status ${status}`);
  const options = { status, headers, body };

  if (status === 401 || status === 403) {
    return new LaminaAuthError(message, options);
  }

  if (status === 429) {
    return new LaminaRateLimitError(message, options);
  }

  return new LaminaError(message, options);
}
