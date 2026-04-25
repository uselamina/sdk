/**
 * OpenAI Function Calling integration for Lamina.
 *
 * Exports tool definitions compatible with OpenAI's chat completions API
 * and a dispatcher to route function calls to the Lamina SDK.
 */

import type { LaminaClient } from '../client.js';

// ─── Tool definitions ─────────────────────────────────────────────────────

export interface OpenAIToolFunction {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

const LAMINA_CREATE_TOOL: OpenAIToolFunction = {
  type: 'function',
  function: {
    name: 'lamina_create',
    description:
      'Create content from a natural language brief. Lamina automatically selects the best workflow, applies brand context and prompt engineering, and starts execution. Returns a run ID.',
    parameters: {
      type: 'object',
      properties: {
        brief: {
          type: 'string',
          description:
            'Natural language description of what to create (e.g. "Instagram carousel showcasing spring collection").',
        },
        platform: {
          type: 'string',
          description: 'Target platform (e.g. "instagram", "twitter").',
        },
        modality: {
          type: 'string',
          enum: ['image', 'video'],
          description: 'Content type. Auto-detected from brief if omitted.',
        },
        brandProfileId: { type: 'string', description: 'Brand profile ID.' },
        campaignId: { type: 'string', description: 'Campaign ID.' },
        appId: { type: 'string', description: 'Override auto-selection with a specific app ID.' },
      },
      required: ['brief'],
    },
  },
};

const LAMINA_WAIT_TOOL: OpenAIToolFunction = {
  type: 'function',
  function: {
    name: 'lamina_wait_for_run',
    description: 'Wait for a Lamina run to complete and return the results.',
    parameters: {
      type: 'object',
      properties: {
        runId: { type: 'string', description: 'The Lamina run ID.' },
        timeoutSeconds: {
          type: 'number',
          description: 'Maximum wait time in seconds (default 60, max 120).',
        },
      },
      required: ['runId'],
    },
  },
};

const LAMINA_DISCOVER_TOOL: OpenAIToolFunction = {
  type: 'function',
  function: {
    name: 'lamina_discover_apps',
    description:
      'Discover Lamina apps matching creative intent. Returns ranked matches with capabilities and estimated cost.',
    parameters: {
      type: 'object',
      properties: {
        intent: {
          type: 'string',
          description:
            'Describe what you want to create (e.g. "product lifestyle photo with model swap").',
        },
        maxCredits: { type: 'number', description: 'Maximum credit budget.' },
        outputFormat: { type: 'string', description: 'Required output format (e.g. "image/png").' },
        limit: { type: 'integer', description: 'Max results (default 5, max 10).' },
      },
      required: ['intent'],
    },
  },
};

const LAMINA_BRAND_CONTEXT_TOOL: OpenAIToolFunction = {
  type: 'function',
  function: {
    name: 'lamina_get_brand_context',
    description:
      'Get brand context for content creation — brand DNA, guidance directives, and top-performing patterns.',
    parameters: {
      type: 'object',
      properties: {
        brandProfileId: { type: 'string', description: 'Brand profile ID.' },
        platform: { type: 'string', description: 'Target platform.' },
        modality: { type: 'string', description: 'Content modality.' },
      },
    },
  },
};

const LAMINA_BATCH_CREATE_TOOL: OpenAIToolFunction = {
  type: 'function',
  function: {
    name: 'lamina_batch_create',
    description: 'Create multiple pieces of content in parallel from an array of briefs (max 10).',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              brief: { type: 'string', description: 'What to create.' },
              platform: { type: 'string' },
              modality: { type: 'string' },
            },
            required: ['brief'],
          },
          minItems: 1,
          maxItems: 10,
          description: 'Array of content briefs.',
        },
        brandProfileId: { type: 'string', description: 'Default brand profile for all items.' },
        campaignId: { type: 'string', description: 'Default campaign for all items.' },
      },
      required: ['items'],
    },
  },
};

/**
 * Get all Lamina tool definitions for OpenAI function calling.
 *
 * Usage:
 * ```ts
 * import { getLaminaOpenAITools } from '@uselamina/sdk/integrations';
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-4o',
 *   messages,
 *   tools: getLaminaOpenAITools(),
 * });
 * ```
 */
export function getLaminaOpenAITools(): OpenAIToolFunction[] {
  return [
    LAMINA_CREATE_TOOL,
    LAMINA_WAIT_TOOL,
    LAMINA_DISCOVER_TOOL,
    LAMINA_BRAND_CONTEXT_TOOL,
    LAMINA_BATCH_CREATE_TOOL,
  ];
}

// ─── Dispatcher ───────────────────────────────────────────────────────────

/**
 * Route an OpenAI function call to the appropriate Lamina SDK method.
 *
 * Usage:
 * ```ts
 * import { handleLaminaToolCall } from '@uselamina/sdk/integrations';
 * const result = await handleLaminaToolCall(laminaClient, toolCall.function.name, JSON.parse(toolCall.function.arguments));
 * ```
 */
export async function handleLaminaToolCall(
  client: LaminaClient,
  functionName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (functionName) {
    case 'lamina_create':
      return client.content.create({
        brief: args.brief as string,
        platform: args.platform as string | undefined,
        modality: args.modality as string | undefined,
        brandProfileId: args.brandProfileId as string | undefined,
        campaignId: args.campaignId as string | undefined,
        appId: args.appId as string | undefined,
      });

    case 'lamina_wait_for_run':
      return client.runs.wait(args.runId as string, {
        timeoutMs: args.timeoutSeconds
          ? (args.timeoutSeconds as number) * 1000
          : undefined,
      });

    case 'lamina_discover_apps':
      return client.apps.discover({
        intent: args.intent as string,
        constraints: {
          ...(args.maxCredits != null ? { maxCredits: args.maxCredits as number } : {}),
          ...(args.outputFormat ? { outputFormat: args.outputFormat as string } : {}),
        },
        limit: args.limit as number | undefined,
      });

    case 'lamina_get_brand_context':
      return client.intelligence.getBrandContext({
        brandProfileId: args.brandProfileId as string | undefined,
        platform: args.platform as string | undefined,
        modality: args.modality as string | undefined,
      });

    case 'lamina_batch_create': {
      return client.request('/v1/content/batch', {
        method: 'POST',
        body: {
          items: args.items,
          brandProfileId: args.brandProfileId,
          campaignId: args.campaignId,
        },
      });
    }

    default:
      throw new Error(`Unknown Lamina tool: ${functionName}`);
  }
}
