import type {
  ApiEnvelope,
  AutoGenerateParams,
  AutoGenerateResult,
  ContentBriefParams,
  ContentBriefResult,
  ContentPlanParams,
  ContentPlanResult,
  LaminaCreateParams,
  LaminaCreateResult,
  LaminaRequestFn,
  PreviewRunParams,
  PreviewRunResult,
  RunConfirmedParams,
  RunConfirmedResult,
  ScoreContentParams,
} from './types.js';

export function createContentApi(request: LaminaRequestFn) {
  return {
    create(params: LaminaCreateParams) {
      return request<ApiEnvelope<LaminaCreateResult>>('/v1/content/create', {
        method: 'POST',
        body: params,
      });
    },

    score(params: ScoreContentParams = {}) {
      return request<ApiEnvelope<unknown>>('/v1/content/score', {
        method: 'POST',
        body: params,
      });
    },

    brief(params: ContentBriefParams) {
      return request<ApiEnvelope<ContentBriefResult>>('/v1/content/brief', {
        method: 'POST',
        body: params,
      });
    },

    autoGenerate(params: AutoGenerateParams) {
      return request<ApiEnvelope<AutoGenerateResult>>('/v1/content/auto-generate', {
        method: 'POST',
        body: params,
      });
    },

    /**
     * Lightweight planner: pick an app, classify each input as
     * drafted/defaulted/must_supply. Dispatches only when `autoDispatch=true`
     * and nothing's missing. Use this from CLI or agent contexts.
     */
    plan(params: ContentPlanParams) {
      return request<ApiEnvelope<ContentPlanResult>>('/v1/content/plan', {
        method: 'POST',
        body: params,
      });
    },

    /**
     * Preview-then-confirm flow: agent drafts the plan WITHOUT dispatching.
     * Returns chosen app + drafted inputs + missing inputs (with suggested
     * defaults), OR a freestyle recipe, OR a multi-app choice. Caller renders
     * a decision card; user reviews + completes; caller invokes `run()` to
     * actually dispatch.
     */
    previewRun(params: PreviewRunParams) {
      return request<ApiEnvelope<PreviewRunResult>>('/v1/content/preview-run', {
        method: 'POST',
        body: params,
      });
    },

    /**
     * Dispatch the confirmed plan returned by `previewRun()` (with any user
     * edits to drafted/missing inputs). Returns `{ runId, mode, ... }` —
     * caller polls via `client.runs.wait(runId)` (mode='app') or
     * `client.freestyle.wait(runId)` (mode='freestyle').
     */
    run(params: RunConfirmedParams) {
      return request<ApiEnvelope<RunConfirmedResult>>('/v1/content/run', {
        method: 'POST',
        body: params,
      });
    },
  };
}
