# `@uselamina/sdk`

TypeScript SDK for the Lamina public `/v1` API.

Lamina is a headless creative engine for AI agents. The SDK provides a typed client for discovering apps, running executions, polling for results, managing webhooks, and accessing intelligence endpoints.

**Use the SDK when:** you need programmatic Node.js/TypeScript integration with the Lamina API.

See also: [`@uselamina/mcp`](https://github.com/uselamina/lamina-mcp) for MCP server (agent tool access), [`@uselamina/cli`](https://github.com/uselamina/lamina-cli) for terminal interface.

## Install

```bash
npm install @uselamina/sdk
```

## Quick start

```typescript
import { LaminaClient } from '@uselamina/sdk';

const client = new LaminaClient({ apiKey: 'lma_your_api_key' });

// List available apps
const apps = await client.apps.list();

// Run an app
const run = await client.runs.run('app-id', { inputs: { Front: 'https://example.com/photo.jpg' } });

// Wait for completion
const result = await client.runs.wait(run.data.runId);
```

## Docs

- https://docs.uselamina.ai
- https://docs.uselamina.ai/guides/use-the-cli-and-sdk
