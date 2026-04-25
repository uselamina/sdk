import test from 'node:test';
import assert from 'node:assert/strict';

import { LaminaClient } from '../index.js';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

test('listApps sends x-api-key and query params', async () => {
  const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const client = new LaminaClient({
    apiKey: 'lma_test',
    baseUrl: 'https://app.uselamina.ai/',
    fetch: async (input, init) => {
      requests.push({ input, init });
      return jsonResponse({ data: [] });
    },
  });

  await client.apps.list({ search: 'catalog', limit: 5 });

  assert.equal(String(requests[0]?.input), 'https://app.uselamina.ai/v1/apps?search=catalog&limit=5');
  assert.equal(new Headers(requests[0]?.init?.headers).get('x-api-key'), 'lma_test');
});

test('run serializes inputs and webhook query', async () => {
  const client = new LaminaClient({
    apiKey: 'lma_test',
    fetch: async (_input, init) => {
      assert.equal(init?.method, 'POST');
      assert.equal(new Headers(init?.headers).get('content-type'), 'application/json');
      assert.deepEqual(JSON.parse(String(init?.body)), {
        inputs: { Front: 'https://example.com/front.jpg' },
      });
      return jsonResponse({
        data: {
          runId: 'exec_1',
          workflowId: 'app_1',
          workflowName: 'Catalog',
          status: 'queued',
        },
      }, { status: 202 });
    },
  });

  const payload = await client.runs.run('app_1', {
    inputs: { Front: 'https://example.com/front.jpg' },
    webhook: 'https://example.com/callback',
  });

  assert.equal(payload.data.runId, 'exec_1');
});

test('wait polls until execution is completed', async () => {
  const statuses = ['queued', 'running', 'completed'];
  const client = new LaminaClient({
    apiKey: 'lma_test',
    fetch: async () => {
      const status = statuses.shift() || 'completed';
      return jsonResponse({
        data: {
          runId: 'exec_1',
          workflowId: 'app_1',
          status,
          outputs: [],
          errorMessage: null,
          startedAt: null,
          completedAt: status === 'completed' ? '2026-04-12T00:00:00Z' : null,
          createdAt: '2026-04-12T00:00:00Z',
        },
      });
    },
  });

  const result = await client.runs.wait('exec_1', { intervalMs: 1, timeoutMs: 1000 });
  assert.equal(result.data.status, 'completed');
});
