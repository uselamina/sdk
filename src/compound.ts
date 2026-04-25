import type {
  ApiEnvelope,
  ContentBriefParams,
  ContentBriefResult,
  LaminaCreateParams,
  LaminaCreateResult,
  LaminaRequestFn,
  ScoreContentParams,
} from './types.js';

export function createCompoundApi(request: LaminaRequestFn) {
  return {
    create(params: LaminaCreateParams) {
      return request<ApiEnvelope<LaminaCreateResult>>('/v1/compound/create', {
        method: 'POST',
        body: params,
      });
    },

    score(params: ScoreContentParams = {}) {
      return request<ApiEnvelope<unknown>>('/v1/compound/score', {
        method: 'POST',
        body: params,
      });
    },

    brief(params: ContentBriefParams) {
      return request<ApiEnvelope<ContentBriefResult>>('/v1/compound/brief', {
        method: 'POST',
        body: params,
      });
    },
  };
}
