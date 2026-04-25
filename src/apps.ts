import type { ApiEnvelope, AppDetail, AppSummary, CostEstimate, DiscoverAppsParams, DiscoverAppsResult, LaminaRequestFn, ListAppsParams, WorkflowStructure } from './types.js';

function buildListAppsPath(params: ListAppsParams = {}): string {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set('search', params.search);
  }

  if (typeof params.limit === 'number') {
    searchParams.set('limit', String(params.limit));
  }

  const query = searchParams.toString();
  return query ? `/v1/apps?${query}` : '/v1/apps';
}

export function createAppsApi(request: LaminaRequestFn) {
  return {
    list(params: ListAppsParams = {}) {
      return request<ApiEnvelope<AppSummary[]>>(buildListAppsPath(params));
    },

    get(appId: string) {
      return request<ApiEnvelope<AppDetail>>(`/v1/apps/${encodeURIComponent(appId)}`);
    },

    workflow(appId: string) {
      return request<ApiEnvelope<WorkflowStructure>>(
        `/v1/apps/${encodeURIComponent(appId)}/workflow`
      );
    },

    estimate(appId: string) {
      return request<ApiEnvelope<CostEstimate>>(
        `/v1/apps/${encodeURIComponent(appId)}/estimate`,
        { method: 'POST' }
      );
    },

    discover(params: DiscoverAppsParams) {
      return request<ApiEnvelope<DiscoverAppsResult>>('/v1/apps/discover', {
        method: 'POST',
        body: params,
      });
    },
  };
}
