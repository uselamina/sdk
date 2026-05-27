import type { ApiEnvelope, LaminaRequestFn } from './types.js';

/**
 * Atomic-generate model discovery SDK.
 *
 * Two read-only views over Lamina's curated model registry:
 *   - `list(...)`    → minimal summary per model (id, displayName, modality)
 *   - `describe(id)` → input contract: a flat `paramSchema` where every
 *                       field (including `prompt`) carries its own type,
 *                       constraints, and description. Models that don't
 *                       accept a prompt simply omit it from paramSchema.
 *
 * The agent picks a model by `id` and learns how to call it from the
 * describe response's `paramSchema` — uniform across all models.
 */

export interface LaminaModelSummary {
  id: string;
  displayName: string;
  modality: 'image' | 'video';
}

/**
 * Schema for one field of a model's `paramSchema`. Verbatim from the
 * Lamina registry — present types are `string`, `enum`, `integer`,
 * `number`, `boolean`, `url`, `array<url>`, `array<object>`.
 */
export interface LaminaModelParamSchemaField {
  type: string;
  required?: boolean;
  default?: unknown;
  values?: ReadonlyArray<unknown>;
  min?: number;
  max?: number;
  step?: number;
  minItems?: number;
  maxItems?: number;
  maxLength?: number;
  accept?: ReadonlyArray<string>;
  description?: string;
  itemSchema?: Record<string, LaminaModelParamSchemaField>;
  [key: string]: unknown;
}

/**
 * Describe response — flat `paramSchema` keyed by field name. `prompt`
 * appears here when the model accepts one; it's a regular field with
 * type=string, optional `required`, `maxLength`, and `description`.
 */
export interface LaminaModelDescribe extends LaminaModelSummary {
  paramSchema: Record<string, LaminaModelParamSchemaField>;
}

export interface LaminaModelsListOptions {
  modality?: 'image' | 'video';
}

export interface LaminaModelDescribeOptions {
  modality?: 'image' | 'video';
}

export function createModelsApi(request: LaminaRequestFn) {
  return {
    /**
     * List atomic-generate models. Default modality is 'image'; pass
     * `{ modality: 'video' }` to see the video catalog.
     */
    list(opts: LaminaModelsListOptions = {}) {
      const modality = opts.modality ?? 'image';
      const path = `/v1/models/${modality}`;
      return request<ApiEnvelope<LaminaModelSummary[]>>(path);
    },

    /**
     * Get the input contract for one model. Model ids are globally unique
     * across image + video registries, so `modality` is optional — when
     * omitted, the server searches both. Pass `{ modality }` only if you
     * want to scope the lookup explicitly.
     */
    describe(modelId: string, opts: LaminaModelDescribeOptions = {}) {
      if (!modelId) {
        throw new Error('client.models.describe(modelId): modelId is required');
      }
      const path = opts.modality
        ? `/v1/models/${opts.modality}/${encodeURIComponent(modelId)}`
        : `/v1/models/${encodeURIComponent(modelId)}`;
      return request<ApiEnvelope<LaminaModelDescribe>>(path);
    },
  };
}
