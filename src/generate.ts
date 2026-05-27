import type { ApiEnvelope, LaminaRequestFn } from './types.js';

/**
 * Atomic model-pinned generation surface.
 *
 *   - `client.generate.image(...)`  — every atomic image dispatch
 *                                     (text-to-image AND image-to-image
 *                                     AND edit / remix / background-swap /
 *                                     reframe / etc.). The model id is the
 *                                     discriminator; mode is inferred server-
 *                                     side from the model registry + params.
 *   - `client.generate.video(...)`  — every atomic video dispatch
 *                                     (text-to-video, image-to-video,
 *                                     video-to-video, motion-control,
 *                                     reference-to-video, keyframe). Each
 *                                     video model has one declared mode;
 *                                     the model id picks the operation.
 *   - `client.generate.getRun(id)`  — polymorphic status read.
 *   - `client.generate.wait(id, …)` — client-side polling helper.
 *
 * Same runId space + status endpoint for image and video. The response's
 * `mode` + `output.type` tell you which modality the run is.
 */

export interface LaminaGenerateImageRequest {
  /** Model id from `client.models.list({ modality: 'image' })`. */
  model: string;
  /** Required for most models; some edit models (bria-bg-remove, ideogram-v3-reframe) accept it optionally. */
  prompt?: string;
  /**
   * Model-specific fields per the chosen model's `paramSchema`. Include
   * `imageUrls` (array) or `imageUrl` (string) for image-to-image / edit
   * operations; omit them for text-to-image. Fetch the schema via
   * `client.models.describe(modelId)`.
   */
  params?: Record<string, unknown>;
  webhookUrl?: string | null;
}

export interface LaminaGenerateImageResult {
  runId: string;
  status: 'queued' | 'completed';
  model: string;
  /** Flat bag of every field the dispatch actually sent, including `prompt` when supplied. */
  resolvedParams: Record<string, unknown>;
}

export interface LaminaGenerateVideoRequest {
  /** Model id from `client.models.list({ modality: 'video' })`. */
  model: string;
  /** Required for most video models. */
  prompt?: string;
  /**
   * Model-specific fields per the chosen model's `paramSchema`. Required
   * URL fields depend on the operation — `imageUrl` for image-to-video,
   * `videoUrl` for video-to-video, both for motion-control, `firstFrameUrl`
   * + `lastFrameUrl` for keyframe.
   */
  params?: Record<string, unknown>;
  webhookUrl?: string | null;
}

export interface LaminaGenerateVideoResult {
  runId: string;
  status: 'queued' | 'completed';
  model: string;
  /** Flat bag of every field the dispatch actually sent, including `prompt` when supplied. */
  resolvedParams: Record<string, unknown>;
}

/**
 * Status shape for any atomic run (image or video). `output.type` tells you
 * which modality the result is.
 */
export interface LaminaAtomicRunStatus {
  runId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  model: string | null;
  /** Flat bag of every field the dispatch sent, including `prompt` when supplied. */
  resolvedParams: Record<string, unknown>;
  output: { type: 'image' | 'video'; url: string | null } | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

/** @deprecated Use `LaminaAtomicRunStatus`. */
export type LaminaImageRunStatus = LaminaAtomicRunStatus;

function buildDispatchBody(input: {
  model: string;
  prompt?: string;
  params?: Record<string, unknown>;
  webhookUrl?: string | null;
}) {
  return {
    model: input.model,
    ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
    ...(input.params !== undefined ? { params: input.params } : {}),
    ...(input.webhookUrl !== undefined && input.webhookUrl !== null
      ? { webhookUrl: input.webhookUrl }
      : {}),
  };
}

export function createGenerateApi(request: LaminaRequestFn) {
  return {
    /**
     * Atomic image dispatch — handles every image operation (text-to-
     * image, image-to-image, background-remove, reframe, etc.). The model
     * id selects the operation; for hybrid models, the server picks
     * image-to-image when `params.imageUrls` (non-empty) or
     * `params.imageUrl` is supplied.
     */
    image(input: LaminaGenerateImageRequest) {
      return request<ApiEnvelope<LaminaGenerateImageResult>>('/v1/generate/image', {
        method: 'POST',
        body: buildDispatchBody(input),
      });
    },

    /**
     * Atomic video dispatch — handles every video operation (text-to-
     * video, image-to-video, video-to-video, motion-control, reference-
     * to-video, keyframe). The model id selects the operation; required
     * URL fields in `params` come from the model's paramSchema.
     */
    video(input: LaminaGenerateVideoRequest) {
      return request<ApiEnvelope<LaminaGenerateVideoResult>>('/v1/generate/video', {
        method: 'POST',
        body: buildDispatchBody(input),
      });
    },

    /**
     * Read the current status / result of any atomic run (image or video).
     * Polymorphic — the response's `mode` + `output.type` indicate the
     * modality.
     */
    getRun(runId: string) {
      if (!runId) {
        throw new Error('client.generate.getRun(runId): runId is required');
      }
      return request<ApiEnvelope<LaminaAtomicRunStatus>>(
        `/v1/generate/runs/${encodeURIComponent(runId)}`,
      );
    },

    /**
     * Poll `getRun` until terminal. Default timeout suits most image runs;
     * for fal-backed video runs (which can take 30s–5 min) pass a higher
     * `timeoutMs` (e.g. 600_000).
     */
    async wait(
      runId: string,
      opts: { timeoutMs?: number; intervalMs?: number } = {},
    ): Promise<LaminaAtomicRunStatus> {
      const timeoutMs = opts.timeoutMs ?? 60_000;
      const intervalMs = opts.intervalMs ?? 1000;
      const start = Date.now();
      while (true) {
        const { data } = await this.getRun(runId);
        if (
          data.status === 'completed' ||
          data.status === 'failed' ||
          data.status === 'cancelled'
        ) {
          return data;
        }
        if (Date.now() - start >= timeoutMs) return data;
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    },
  };
}
