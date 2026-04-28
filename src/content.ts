import type {
  ApiEnvelope,
  AutoGenerateParams,
  AutoGenerateResult,
  ContentBriefParams,
  ContentBriefResult,
  LaminaCreateParams,
  LaminaCreateResult,
  LaminaRequestFn,
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
  };
}
