import crypto from 'node:crypto';

import type {
  LaminaRequestFn,
  LaminaWebhookEnvelope,
  LaminaWebhookHeaders,
  LaminaWebhookVerificationResult,
  VerifyWebhookSignatureOptions,
  WebhookSigningKeyResponse,
} from './types.js';

const DEFAULT_MAX_AGE_SECONDS = 300;

function toBodyString(body: string | Uint8Array): string {
  return typeof body === 'string' ? body : Buffer.from(body).toString('utf8');
}

function getHeaderValue(
  headers: Headers | Record<string, string | string[] | undefined | null>,
  name: string
): string | null {
  if (headers instanceof Headers) {
    return headers.get(name);
  }

  const direct = headers[name];
  if (typeof direct === 'string') {
    return direct;
  }
  if (Array.isArray(direct)) {
    return direct[0] ?? null;
  }

  const lowerKey = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  if (!lowerKey) {
    return null;
  }

  const value = headers[lowerKey];
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

export function extractWebhookHeaders(
  headers: Headers | Record<string, string | string[] | undefined | null>
): LaminaWebhookHeaders {
  return {
    signature: getHeaderValue(headers, 'x-lamina-webhook-signature'),
    timestamp: getHeaderValue(headers, 'x-lamina-webhook-timestamp'),
    requestId: getHeaderValue(headers, 'x-lamina-webhook-request-id'),
  };
}

function parseWebhookPayload(body: string): LaminaWebhookEnvelope {
  const parsed = JSON.parse(body) as Partial<LaminaWebhookEnvelope>;
  if (!parsed || typeof parsed !== 'object' || !parsed.data || typeof parsed.data !== 'object') {
    throw new Error('Invalid Lamina webhook payload');
  }

  const runId = (parsed.data as { runId?: unknown }).runId;
  if (!runId || typeof runId !== 'string') {
    throw new Error('Lamina webhook payload is missing data.runId');
  }

  return parsed as LaminaWebhookEnvelope;
}

function isTimestampFresh(timestamp: string, nowMs: number, maxAgeSeconds: number): boolean {
  const parsed = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(parsed)) {
    return false;
  }

  const driftSeconds = Math.abs(Math.floor(nowMs / 1000) - parsed);
  return driftSeconds <= maxAgeSeconds;
}

function verifyAgainstKey(
  signatureHex: string,
  message: string,
  key: Record<string, unknown>
): boolean {
  const signatureBytes = Buffer.from(signatureHex, 'hex');
  const publicKey = crypto.createPublicKey({
    key: {
      ...key,
    },
    format: 'jwk',
  });

  return crypto.verify(null, Buffer.from(message), publicKey, signatureBytes);
}

export function verifyWebhookSignature(
  options: VerifyWebhookSignatureOptions
): LaminaWebhookVerificationResult {
  const body = toBodyString(options.body);
  const headers = extractWebhookHeaders(options.headers);

  if (!headers.signature) {
    return {
      valid: false,
      error: 'Missing X-Lamina-Webhook-Signature header.',
      headers,
    };
  }

  if (!headers.timestamp) {
    return {
      valid: false,
      error: 'Missing X-Lamina-Webhook-Timestamp header.',
      headers,
    };
  }

  const keys = options.keys?.keys || [];
  if (keys.length === 0) {
    return {
      valid: false,
      error: 'No Lamina webhook signing keys were provided.',
      headers,
    };
  }

  const nowMs = options.nowMs ?? Date.now();
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  if (!isTimestampFresh(headers.timestamp, nowMs, maxAgeSeconds)) {
    return {
      valid: false,
      error: 'Lamina webhook timestamp is outside the accepted verification window.',
      headers,
    };
  }

  const message = `${headers.timestamp}.${body}`;

  let matchedKeyId: string | null = null;
  const verified = keys.some((key) => {
    try {
      const ok = verifyAgainstKey(headers.signature!, message, key);
      if (ok) {
        matchedKeyId = typeof key.kid === 'string' ? key.kid : null;
      }
      return ok;
    } catch {
      return false;
    }
  });

  if (!verified) {
    return {
      valid: false,
      error: 'Lamina webhook signature verification failed.',
      headers,
    };
  }

  try {
    const payload = parseWebhookPayload(body);
    if (headers.requestId && payload.data.runId !== headers.requestId) {
      return {
        valid: false,
        error: 'Lamina webhook request id does not match payload run id.',
        headers,
      };
    }

    return {
      valid: true,
      payload,
      headers,
      keyId: matchedKeyId,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid Lamina webhook payload.',
      headers,
    };
  }
}

export function createWebhooksApi(request: LaminaRequestFn) {
  return {
    signingKey() {
      return request<WebhookSigningKeyResponse>('/v1/webhooks/signing-key');
    },

    async verify(options: VerifyWebhookSignatureOptions): Promise<LaminaWebhookVerificationResult> {
      const keys = options.keys || (await request<WebhookSigningKeyResponse>('/v1/webhooks/signing-key'));
      return verifyWebhookSignature({
        ...options,
        keys,
      });
    },
  };
}
