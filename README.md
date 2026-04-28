# `@uselamina/sdk`

TypeScript SDK for the Lamina public `/v1` API.

Lamina is a headless creative engine for AI agents — it generates videos, movies, and images for products, brands, social, and ads. The SDK provides a fully typed Node.js client for discovering apps, running executions, polling or waiting for results, verifying webhooks, calling brand-aware intelligence endpoints, generating content from natural-language briefs, and publishing to connected social channels.

**Use the SDK when:** you need programmatic Node.js/TypeScript integration with the Lamina API.

See also: [`@uselamina/mcp`](https://github.com/uselamina/lamina-mcp) for MCP server (agent tool access), [`@uselamina/cli`](https://github.com/uselamina/lamina-cli) for the terminal interface.

## Install

```bash
npm install @uselamina/sdk
```

Requires Node.js `>=20.19.0`. Pure ESM (`"type": "module"`). Ships full TypeScript definitions — no `@types` package needed.

## Authentication

The SDK authenticates with an `x-api-key` header. API keys start with the `lma_` prefix and are issued from the Lamina dashboard.

Three ways to construct a client:

```typescript
import { LaminaClient } from '@uselamina/sdk';

// 1. Explicit API key
const client = new LaminaClient({ apiKey: 'lma_your_api_key' });

// 2. From the LAMINA_API_KEY environment variable
const client = LaminaClient.fromEnv();

// 3. From credentials saved by the lamina-cli login flow (~/.lamina/config.json)
const client = await LaminaClient.fromStoredCredentials();
```

`LaminaClientOptions` also accepts `baseUrl` (defaults to the Lamina production API) and a custom `fetch` implementation for testing or proxying.

## Quick start

```typescript
import { LaminaClient } from '@uselamina/sdk';

const client = new LaminaClient({ apiKey: 'lma_your_api_key' });

// 1. Find an app
const apps = await client.apps.list({ search: 'product photo' });

// 2. Start a run
const run = await client.runs.run(apps.data[0].appId, {
  inputs: { Front: 'https://example.com/photo.jpg' },
});

// 3. Wait for completion (long-poll; resolves when status is completed/failed)
const result = await client.runs.wait(run.data.runId);
console.log(result.data.outputs);
```

## Resources

The client exposes one namespace per resource. Every method returns an `ApiEnvelope<T>` of the form `{ data: T }` (a few list endpoints also include `pagination`).

| Namespace | Purpose | Key methods |
|-----------|---------|-------------|
| `client.apps` | Discover and inspect generative apps (workflows) | `list`, `get`, `workflow`, `estimate`, `discover` |
| `client.runs` | Start runs, poll status, wait for completion, send refinement feedback | `run`, `get`, `wait`, `serverWait`, `feedback`, `list` |
| `client.webhooks` | Fetch the JWKS signing key set and verify incoming webhook payloads | `signingKey`, `verify` |
| `client.intelligence` | Brand-aware guidance, performance prediction, recommendations, trends | `getBrandContext`, `predict`, `recommendations`, `trends` |
| `client.content` | High-level brief-to-run pipeline; concept brainstorming and scoring | `create`, `brief`, `score` |
| `client.publishing` | Connected social channels, publish content, asset transfer, history | `channels`, `publish`, `transferAsset`, `history` |

`client.executions` and `client.compound` are kept as deprecated aliases for `client.runs` and `client.content`.

### Apps

```typescript
// List apps (paginated, optional text search)
const { data: apps } = await client.apps.list({ search: 'video', limit: 20 });

// Inspect parameters and capabilities of a single app
const { data: app } = await client.apps.get('app_abc123');

// Estimate credit cost before running
const { data: estimate } = await client.apps.estimate('app_abc123');
if (!estimate.affordable) throw new Error('insufficient credits');

// Natural-language app discovery
const { data: matches } = await client.apps.discover({
  intent: 'I want a 9:16 product video for Instagram Reels',
  constraints: { maxCredits: 50, outputFormat: 'video' },
  limit: 3,
});
```

### Runs

```typescript
// Start a run; returns immediately with status: 'queued'
const { data: started } = await client.runs.run('app_abc123', {
  inputs: { Front: 'https://example.com/photo.jpg' },
  webhook: 'https://your-app.example.com/lamina-webhook', // optional
});

// Single status snapshot (no polling)
const { data: status } = await client.runs.get(started.runId);

// Refine a completed run with natural-language feedback
const { data: refined } = await client.runs.feedback(started.runId, {
  feedback: 'Make the background warmer and crop tighter on the product.',
});

// List recent runs with filters
const { data: runs, pagination } = await client.runs.list({
  status: 'completed',
  appId: 'app_abc123',
  limit: 50,
});
```

### Polling vs. waiting

Two ways to block until a run finishes:

- **`runs.wait(runId, options?)`** — client-side polling loop. The SDK calls `GET /v1/runs/:id` every `intervalMs` (default `5000`) until the status is `completed` or `failed`, or `timeoutMs` (default `30 * 60 * 1000`) elapses. Pass an `onPoll` callback to observe progress.
- **`runs.serverWait(runId, { timeout })`** — single long-poll request. The server holds the connection open for up to `timeout` seconds and returns as soon as the run reaches a terminal state. The envelope includes `timeout: true` if the wait window expired before completion, in which case you can call it again.

```typescript
// Client-side polling with progress
await client.runs.wait(runId, {
  intervalMs: 3000,
  timeoutMs: 10 * 60 * 1000,
  onPoll: ({ status, progress }) => {
    console.log(status, progress?.percentComplete);
  },
});

// Server-side long-poll loop
let envelope = await client.runs.serverWait(runId, { timeout: 30 });
while (envelope.timeout) {
  envelope = await client.runs.serverWait(runId, { timeout: 30 });
}
```

For long-running runs in production, prefer **webhooks** over either polling strategy.

### Webhooks

Lamina signs webhook deliveries with an Ed25519 key published as JWKS. The SDK fetches the key set and verifies the signature, timestamp freshness (default ±5 minutes), and request-id/payload consistency in one call.

```typescript
import express from 'express';
import { LaminaClient } from '@uselamina/sdk';

const client = new LaminaClient({ apiKey: process.env.LAMINA_API_KEY! });
const app = express();

app.post(
  '/lamina-webhook',
  express.raw({ type: 'application/json' }), // raw body required for signature verification
  async (req, res) => {
    const result = await client.webhooks.verify({
      body: req.body, // Buffer or string
      headers: req.headers,
    });

    if (!result.valid) {
      console.warn('rejected webhook:', result.error);
      return res.status(400).send(result.error);
    }

    const { runId, status, outputs } = result.payload.data;
    // …handoff to your queue / persist / notify
    res.sendStatus(200);
  },
);
```

For ad-hoc verification without an HTTP framework — or to cache the JWKS yourself — use the lower-level helpers:

```typescript
import { verifyWebhookSignature, extractWebhookHeaders } from '@uselamina/sdk';

const keys = await client.webhooks.signingKey(); // cache this (rotation is rare)
const result = verifyWebhookSignature({ body, headers, keys });
```

The `LaminaWebhookListener` class also provides a local development listener that exposes received events as an async iterator — useful for tunneling tools and CLI workflows.

### Intelligence

Brand-aware endpoints that surface guidance, predictions, and trend patterns from a workspace's content history.

```typescript
const { data: ctx } = await client.intelligence.getBrandContext({
  brandProfileId: 'brand_123',
  platform: 'instagram',
  modality: 'video',
});
// ctx.brandDna, ctx.guidance, ctx.topPatterns

const { data: pred } = await client.intelligence.predict({
  concept: 'minimalist studio shot of the product on a peach gradient',
  platform: 'instagram',
  modality: 'image',
  brandProfileId: 'brand_123',
});

const { data: recs } = await client.intelligence.recommendations({ campaignId: 'camp_42' });
const { data: trends } = await client.intelligence.trends({ platform: 'tiktok', windowDays: 30 });
```

### Content

Higher-level brief-to-run pipeline. `create` selects an app, applies brand context and guidance, and either starts a run or returns `needsInput` when required parameters are missing. `brief` brainstorms scored content concepts; `score` ranks existing items.

```typescript
const { data } = await client.content.create({
  brief: 'Hero image for our new running shoe, energetic, 1:1 for Instagram',
  platform: 'instagram',
  modality: 'image',
  brandProfileId: 'brand_123',
  autoQuality: { enabled: true, minScore: 0.75, maxRetries: 2 },
});

if (data.needsInput) {
  console.log('still need:', data.needsInput.missing);
} else {
  const final = await client.runs.wait(data.runId!);
}
```

### Publishing

```typescript
const { data: channels } = await client.publishing.channels();

const { data: result } = await client.publishing.publish({
  accountIds: channels.map((c) => c.id),
  imageUrl: 'https://cdn.uselamina.com/...',
  caption: 'New drop. Out now.',
});
console.log(result.summary); // { total, success, failed }
```

## Error handling

Non-2xx responses throw a typed error. `LaminaError` is the base class; `LaminaAuthError` (401/403) and `LaminaRateLimitError` (429) are subclasses. Every error carries `status`, `body`, and the original `Headers`.

```typescript
import { LaminaAuthError, LaminaError, LaminaRateLimitError } from '@uselamina/sdk';

try {
  await client.runs.run('app_abc123', { inputs: {} });
} catch (err) {
  if (err instanceof LaminaAuthError) {
    // 401/403 — bad API key, revoked key, or insufficient permission
  } else if (err instanceof LaminaRateLimitError) {
    const wait = err.retryAfterSeconds ?? 5;
    await new Promise((r) => setTimeout(r, wait * 1000));
  } else if (err instanceof LaminaError) {
    console.error(err.status, err.message, err.body);
  } else {
    throw err; // network, timeout, JSON parse, etc.
  }
}
```

`runs.wait` throws a plain `Error` if `timeoutMs` elapses before the run reaches a terminal state — catch it separately if you want to fall back to a webhook flow.

## Types

All request and response types are exported from the package root, including `AppDetail`, `ExecutionStarted`, `ExecutionStatus`, `ExecutionOutput`, `ListRunsResult`, `LaminaWebhookEnvelope`, `LaminaWebhookVerificationResult`, `BrandContextResponse`, `PerformancePrediction`, `LaminaCreateResult`, `PublishResult`, and the option/param types for every method. Import them directly:

```typescript
import type {
  ExecutionStatus,
  LaminaWebhookEnvelope,
  RunExecutionParams,
} from '@uselamina/sdk';
```

`LaminaExecutionStatusState` is the enum of run states: `'queued' | 'running' | 'completed' | 'failed'`.

## Docs

- API & guides: https://docs.uselamina.ai
- SDK + CLI guide: https://docs.uselamina.ai/guides/use-the-cli-and-sdk
- Issues: https://github.com/uselamina/lamina-sdk/issues
