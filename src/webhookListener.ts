import http, { type IncomingMessage, type ServerResponse } from 'node:http';

import type {
  LaminaWebhookListenerEvent,
  LaminaWebhookListenerStatus,
  WaitForWebhookEventOptions,
  WebhookSigningKeyResponse,
} from './types.js';

function normalizePath(path: string | undefined): string {
  const raw = (path || '/lamina/webhook').trim();
  if (!raw) {
    return '/lamina/webhook';
  }

  return raw.startsWith('/') ? raw : `/${raw}`;
}

function buildUrl(host: string, port: number, path: string): string {
  return `http://${host}:${port}${path}`;
}

async function readRawRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function writeJson(res: ServerResponse, statusCode: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

export interface LaminaWebhookListenerClient {
  webhooks: {
    signingKey(): Promise<WebhookSigningKeyResponse>;
    verify(options: {
      body: string | Uint8Array;
      headers: IncomingMessage['headers'];
      keys?: WebhookSigningKeyResponse;
      maxAgeSeconds?: number;
    }): Promise<import('./types.js').LaminaWebhookVerificationResult>;
  };
}

export interface LaminaWebhookListenerOptions {
  client: LaminaWebhookListenerClient;
  host?: string;
  port?: number;
  path?: string;
  publicUrl?: string | null;
  maxAgeSeconds?: number;
  onEvent?: (event: LaminaWebhookListenerEvent) => void | Promise<void>;
}

interface PendingWaiter {
  afterSequence: number;
  resolve: (event: LaminaWebhookListenerEvent) => void;
  reject: (error: Error) => void;
  timer?: NodeJS.Timeout;
}

export class LaminaWebhookListener {
  private readonly client: LaminaWebhookListenerClient;
  private readonly host: string;
  private readonly port: number;
  private readonly path: string;
  private readonly publicUrl: string | null;
  private readonly maxAgeSeconds: number;
  private readonly onEvent?: (event: LaminaWebhookListenerEvent) => void | Promise<void>;
  private server: http.Server | null = null;
  private events: LaminaWebhookListenerEvent[] = [];
  private nextSequence = 1;
  private waiters: PendingWaiter[] = [];
  private signingKeysCache: { value: WebhookSigningKeyResponse; fetchedAtMs: number } | null = null;

  constructor(options: LaminaWebhookListenerOptions) {
    this.client = options.client;
    this.host = options.host || '127.0.0.1';
    this.port = options.port || 8788;
    this.path = normalizePath(options.path);
    this.publicUrl = options.publicUrl || null;
    this.maxAgeSeconds = options.maxAgeSeconds || 300;
    this.onEvent = options.onEvent;
  }

  getStatus(): LaminaWebhookListenerStatus {
    return {
      running: this.server !== null,
      host: this.host,
      port: this.port,
      path: this.path,
      localUrl: buildUrl(this.host, this.port, this.path),
      publicUrl: this.publicUrl,
      eventCount: this.events.length,
    };
  }

  listEvents(limit = 20): LaminaWebhookListenerEvent[] {
    return this.events.slice(-limit);
  }

  clearEvents(): void {
    this.events = [];
  }

  async waitForEvent(
    options: WaitForWebhookEventOptions = {}
  ): Promise<LaminaWebhookListenerEvent> {
    const afterSequence = options.afterSequence ?? 0;
    const existing = this.events.find((event) => event.sequence > afterSequence);
    if (existing) {
      return existing;
    }

    return new Promise<LaminaWebhookListenerEvent>((resolve, reject) => {
      const waiter: PendingWaiter = { afterSequence, resolve, reject };
      if (typeof options.timeoutMs === 'number' && options.timeoutMs > 0) {
        waiter.timer = setTimeout(() => {
          this.waiters = this.waiters.filter((candidate) => candidate !== waiter);
          reject(new Error('Timed out waiting for Lamina webhook event.'));
        }, options.timeoutMs);
      }

      this.waiters.push(waiter);
    });
  }

  async start(): Promise<LaminaWebhookListenerStatus> {
    if (this.server) {
      return this.getStatus();
    }

    await this.getSigningKeys(true);

    this.server = http.createServer((req, res) => {
      void this.handleRequest(req, res).catch(async (error) => {
        await writeJson(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : 'Failed to process Lamina webhook.',
        }).catch(() => {});
      });
    });

    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        this.server?.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        this.server?.off('error', onError);
        resolve();
      };

      this.server?.once('error', onError);
      this.server?.once('listening', onListening);
      this.server?.listen(this.port, this.host);
    });

    return this.getStatus();
  }

  async close(): Promise<void> {
    const server = this.server;
    this.server = null;

    for (const waiter of this.waiters) {
      if (waiter.timer) {
        clearTimeout(waiter.timer);
      }
      waiter.reject(new Error('Lamina webhook listener stopped.'));
    }
    this.waiters = [];

    if (!server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private async getSigningKeys(forceRefresh = false): Promise<WebhookSigningKeyResponse> {
    const cache = this.signingKeysCache;
    if (!forceRefresh && cache && Date.now() - cache.fetchedAtMs < 60 * 60 * 1000) {
      return cache.value;
    }

    const value = await this.client.webhooks.signingKey();
    this.signingKeysCache = {
      value,
      fetchedAtMs: Date.now(),
    };
    return value;
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const requestPath = req.url ? new URL(req.url, 'http://localhost').pathname : '/';

    if (requestPath !== this.path) {
      await writeJson(res, 404, { error: 'Not found' });
      return;
    }

    if (req.method !== 'POST') {
      await writeJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    const body = await readRawRequestBody(req);

    let signingKeys = await this.getSigningKeys(false);
    let verification = await this.client.webhooks.verify({
      body,
      headers: req.headers,
      keys: signingKeys,
      maxAgeSeconds: this.maxAgeSeconds,
    });

    if (!verification.valid) {
      signingKeys = await this.getSigningKeys(true);
      verification = await this.client.webhooks.verify({
        body,
        headers: req.headers,
        keys: signingKeys,
        maxAgeSeconds: this.maxAgeSeconds,
      });
    }

    const event: LaminaWebhookListenerEvent = {
      sequence: this.nextSequence++,
      receivedAt: new Date().toISOString(),
      verified: verification.valid,
      requestId: verification.headers.requestId,
      headers: verification.headers,
      payload: verification.valid ? verification.payload : null,
      error: verification.valid ? null : verification.error,
      body,
    };

    this.events.push(event);
    this.flushWaiters(event);
    await this.onEvent?.(event);

    if (!verification.valid) {
      await writeJson(res, 401, {
        ok: false,
        error: verification.error,
      });
      return;
    }

    await writeJson(res, 200, {
      ok: true,
      requestId: event.requestId,
      sequence: event.sequence,
    });
  }

  private flushWaiters(event: LaminaWebhookListenerEvent): void {
    const ready = this.waiters.filter((waiter) => event.sequence > waiter.afterSequence);
    this.waiters = this.waiters.filter((waiter) => event.sequence <= waiter.afterSequence);

    for (const waiter of ready) {
      if (waiter.timer) {
        clearTimeout(waiter.timer);
      }
      waiter.resolve(event);
    }
  }
}
