import type {
  ApiEnvelope,
  BrandContextParams,
  BrandContextResponse,
  LaminaRequestFn,
  PerformancePrediction,
  PredictParams,
  Recommendation,
  RecommendationsParams,
  TrendPatternSummary,
  TrendsParams,
} from './types.js';

function buildQueryPath(base: string, params: object): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `${base}?${query}` : base;
}

export function createIntelligenceApi(request: LaminaRequestFn) {
  return {
    getBrandContext(params: BrandContextParams = {}) {
      return request<ApiEnvelope<BrandContextResponse>>(
        buildQueryPath('/v1/intelligence/brand-context', params)
      );
    },

    predict(params: PredictParams) {
      return request<ApiEnvelope<PerformancePrediction>>('/v1/intelligence/predict', {
        method: 'POST',
        body: params,
      });
    },

    recommendations(params: RecommendationsParams = {}) {
      return request<ApiEnvelope<Recommendation[]>>(
        buildQueryPath('/v1/intelligence/recommendations', params)
      );
    },

    trends(params: TrendsParams = {}) {
      return request<ApiEnvelope<TrendPatternSummary>>(
        buildQueryPath('/v1/intelligence/trends', params)
      );
    },
  };
}
