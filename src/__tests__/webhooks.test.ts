import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { LaminaWebhookListener, verifyWebhookSignature } from '../index.js';

function sign(body: string, timestamp: string, privateKey: crypto.KeyObject): string {
  return crypto.sign(null, Buffer.from(`${timestamp}.${body}`), privateKey).toString('hex');
}

test('verifyWebhookSignature accepts a valid Lamina-signed payload', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const body = JSON.stringify({
    data: {
      runId: 'exec_1',
      workflowId: 'wf_1',
      status: 'completed',
      outputs: [],
      errorMessage: null,
      startedAt: '2026-04-12T00:00:00Z',
      completedAt: '2026-04-12T00:00:05Z',
      createdAt: '2026-04-12T00:00:00Z',
    },
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = sign(body, timestamp, privateKey);

  const result = verifyWebhookSignature({
    body,
    headers: {
      'x-lamina-webhook-signature': signature,
      'x-lamina-webhook-timestamp': timestamp,
      'x-lamina-webhook-request-id': 'exec_1',
    },
    keys: {
      keys: [
        {
          ...publicKey.export({ format: 'jwk' }),
          kid: 'lamina-webhook-v1',
          alg: 'EdDSA',
          use: 'sig',
        },
      ],
    },
  });

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.payload.data.runId, 'exec_1');
    assert.equal(result.keyId, 'lamina-webhook-v1');
  }
});

test('LaminaWebhookListener accepts and records verified webhook events', async (t) => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const listener = new LaminaWebhookListener({
    client: {
      webhooks: {
        async signingKey() {
          return {
            keys: [
              {
                ...publicKey.export({ format: 'jwk' }),
                kid: 'lamina-webhook-v1',
                alg: 'EdDSA',
                use: 'sig',
              },
            ],
          };
        },
        async verify(options) {
          return verifyWebhookSignature({
            body: options.body,
            headers: options.headers,
            keys: options.keys,
            maxAgeSeconds: options.maxAgeSeconds,
          });
        },
      },
    },
    port: 8799,
  });

  let status;
  try {
    status = await listener.start();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EPERM') {
      t.skip('Sandbox does not allow binding local listener ports.');
      return;
    }
    throw error;
  }
  const body = JSON.stringify({
    data: {
      runId: 'exec_listener',
      workflowId: 'wf_1',
      status: 'completed',
      outputs: [],
      errorMessage: null,
      startedAt: '2026-04-12T00:00:00Z',
      completedAt: '2026-04-12T00:00:05Z',
      createdAt: '2026-04-12T00:00:00Z',
    },
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = sign(body, timestamp, privateKey);

  const response = await fetch(status.localUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-lamina-webhook-signature': signature,
      'x-lamina-webhook-timestamp': timestamp,
      'x-lamina-webhook-request-id': 'exec_listener',
    },
    body,
  });

  assert.equal(response.status, 200);
  const event = await listener.waitForEvent({ timeoutMs: 1000 });
  assert.equal(event.verified, true);
  assert.equal(event.payload?.data.runId, 'exec_listener');

  await listener.close();
});
