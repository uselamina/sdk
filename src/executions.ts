import { waitForExecution } from './polling.js';
import type {
  ApiEnvelope,
  ExecutionStarted,
  ExecutionStatus,
  FeedbackParams,
  FeedbackResult,
  LaminaRequestFn,
  ListRunsParams,
  ListRunsResult,
  RunExecutionParams,
  ServerWaitEnvelope,
  ServerWaitOptions,
  WaitForExecutionOptions,
} from './types.js';

export function createExecutionsApi(request: LaminaRequestFn) {
  return {
    run(appId: string, params: RunExecutionParams) {
      const path = new URL(`/v1/apps/${encodeURIComponent(appId)}/runs`, 'https://lamina.local');
      if (params.webhook) {
        path.searchParams.set('webhook', params.webhook);
      }

      return request<ApiEnvelope<ExecutionStarted>>(`${path.pathname}${path.search}`, {
        method: 'POST',
        body: { inputs: params.inputs },
      });
    },

    get(runId: string) {
      return request<ApiEnvelope<ExecutionStatus>>(
        `/v1/runs/${encodeURIComponent(runId)}`
      );
    },

    wait(runId: string, options: WaitForExecutionOptions = {}) {
      return waitForExecution(request, runId, options);
    },

    serverWait(runId: string, options: ServerWaitOptions = {}) {
      const path = new URL(`/v1/runs/${encodeURIComponent(runId)}/wait`, 'https://lamina.local');
      if (options.timeout !== undefined) {
        path.searchParams.set('timeout', String(options.timeout));
      }
      return request<ServerWaitEnvelope>(`${path.pathname}${path.search}`);
    },

    feedback(runId: string, params: FeedbackParams) {
      return request<ApiEnvelope<FeedbackResult>>(
        `/v1/runs/${encodeURIComponent(runId)}/feedback`,
        { method: 'POST', body: params }
      );
    },

    list(params: ListRunsParams = {}) {
      const path = new URL('/v1/runs', 'https://lamina.local');
      if (params.status) path.searchParams.set('status', params.status);
      if (params.appId) path.searchParams.set('appId', params.appId);
      if (params.limit !== undefined) path.searchParams.set('limit', String(params.limit));
      if (params.offset !== undefined) path.searchParams.set('offset', String(params.offset));
      if (params.since) path.searchParams.set('since', params.since);
      return request<ListRunsResult>(`${path.pathname}${path.search}`);
    },
  };
}
