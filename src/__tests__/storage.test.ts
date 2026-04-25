import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  clearStoredWebhookConfig,
  clearStoredCredentials,
  readStoredWebhookConfig,
  readStoredCredentials,
  writeStoredCredentials,
  writeStoredWebhookConfig,
} from '../index.js';

test('stored credentials round-trip through disk', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lamina-sdk-test-'));
  const configPath = join(dir, 'config.json');

  await writeStoredCredentials(
    {
      apiKey: 'lma_test',
      baseUrl: 'https://app.uselamina.ai',
      savedAt: '2026-04-12T00:00:00Z',
    },
    configPath
  );

  const saved = await readStoredCredentials(configPath);
  assert.deepEqual(saved, {
    apiKey: 'lma_test',
    baseUrl: 'https://app.uselamina.ai',
    savedAt: '2026-04-12T00:00:00Z',
  });

  await clearStoredCredentials(configPath);
  const cleared = await readStoredCredentials(configPath);
  assert.equal(cleared, null);
});

test('stored webhook config round-trips and survives credential clears', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lamina-sdk-test-'));
  const configPath = join(dir, 'config.json');

  await writeStoredCredentials(
    {
      apiKey: 'lma_test',
      baseUrl: 'https://app.uselamina.ai',
      savedAt: '2026-04-12T00:00:00Z',
    },
    configPath
  );

  await writeStoredWebhookConfig(
    {
      publicUrl: 'https://example.ngrok.dev/lamina/webhook',
      host: '127.0.0.1',
      port: 8788,
      path: '/lamina/webhook',
      savedAt: '2026-04-12T00:00:00Z',
    },
    configPath
  );

  const webhook = await readStoredWebhookConfig(configPath);
  assert.deepEqual(webhook, {
    publicUrl: 'https://example.ngrok.dev/lamina/webhook',
    host: '127.0.0.1',
    port: 8788,
    path: '/lamina/webhook',
    savedAt: '2026-04-12T00:00:00Z',
  });

  await clearStoredCredentials(configPath);
  const credentials = await readStoredCredentials(configPath);
  assert.equal(credentials, null);
  const preservedWebhook = await readStoredWebhookConfig(configPath);
  assert.deepEqual(preservedWebhook, webhook);

  await clearStoredWebhookConfig(configPath);
  const clearedWebhook = await readStoredWebhookConfig(configPath);
  assert.equal(clearedWebhook, null);
});
