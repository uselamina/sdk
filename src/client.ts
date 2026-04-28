import { createAppsApi } from './apps.js';
import { requireApiKey } from './auth.js';
import { createContentApi } from './content.js';
import { resolveClientOptions } from './config.js';
import { createLaminaError } from './errors.js';
import { createExecutionsApi } from './executions.js';
import { createIntelligenceApi } from './intelligence.js';
import { createPublishingApi } from './publishing.js';
// NOTE: `./storage.js` is intentionally NOT imported at module load time —
// it depends on Node-only modules (`node:fs/promises`, `node:os`, `node:path`)
// and would break browser bundlers (Vite, webpack, etc.) at build time.
// `fromStoredCredentials()` lazy-loads it via dynamic `import()` so the
// browser bundle never reaches it.
import type {
  LaminaClientOptions,
  LaminaRequestFn,
  LaminaRequestInit,
} from './types.js';
import { createWebhooksApi } from './webhooks.js';

function isRequestBodyJsonLike(value: unknown): boolean {
  return (
    value !== undefined &&
    value !== null &&
    typeof value === 'object' &&
    !(value instanceof ArrayBuffer) &&
    !(value instanceof Blob) &&
    !(value instanceof FormData) &&
    !(value instanceof URLSearchParams)
  );
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return JSON.parse(text) as unknown;
  }

  return text;
}

export class LaminaClient {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly fetchImpl: typeof globalThis.fetch;
  readonly apps: ReturnType<typeof createAppsApi>;
  readonly content: ReturnType<typeof createContentApi>;
  /** @deprecated Use `.content` instead */
  readonly compound: ReturnType<typeof createContentApi>;
  readonly runs: ReturnType<typeof createExecutionsApi>;
  /** @deprecated Use `.runs` instead */
  readonly executions: ReturnType<typeof createExecutionsApi>;
  readonly intelligence: ReturnType<typeof createIntelligenceApi>;
  readonly publishing: ReturnType<typeof createPublishingApi>;
  readonly webhooks: ReturnType<typeof createWebhooksApi>;

  constructor(options: LaminaClientOptions = {}) {
    const resolved = resolveClientOptions(options);

    this.apiKey = requireApiKey({ apiKey: resolved.apiKey });
    this.baseUrl = resolved.baseUrl;
    this.fetchImpl = resolved.fetch;

    const request: LaminaRequestFn = this.request.bind(this);
    this.apps = createAppsApi(request);
    this.content = createContentApi(request);
    this.compound = this.content; // backward compat
    this.runs = createExecutionsApi(request);
    this.executions = this.runs; // backward compat
    this.intelligence = createIntelligenceApi(request);
    this.publishing = createPublishingApi(request);
    this.webhooks = createWebhooksApi(request);
  }

  static fromEnv(options: Omit<LaminaClientOptions, 'apiKey'> = {}): LaminaClient {
    return new LaminaClient({
      ...options,
      apiKey: process.env.LAMINA_API_KEY,
    });
  }

  // `fromStoredCredentials()` was removed in 0.3.2 — it forced storage.js
  // (Node-only) into browser bundles via a dynamic import that bundlers
  // still walk and bundle as a code-split chunk. CLI users who want the
  // same behavior compose it explicitly:
  //
  //   import { LaminaClient } from '@uselamina/sdk';
  //   import { readStoredCredentials } from '@uselamina/sdk/storage';
  //
  //   const stored = await readStoredCredentials();
  //   const client = new LaminaClient({
  //     apiKey: stored.apiKey,
  //     baseUrl: stored.baseUrl,
  //   });

  async request<T>(path: string, init: LaminaRequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers || {});
    headers.set('x-api-key', this.apiKey);

    let body: BodyInit | undefined;
    if (typeof init.body === 'string' || init.body instanceof URLSearchParams) {
      body = init.body;
    } else if (isRequestBodyJsonLike(init.body)) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(init.body);
    } else if (init.body !== undefined && init.body !== null) {
      body = init.body as BodyInit;
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      body,
    });

    const payload = await parseResponseBody(response);

    if (!response.ok) {
      throw createLaminaError(response.status, response.headers, payload);
    }

    return payload as T;
  }
}
