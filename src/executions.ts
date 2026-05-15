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
  RunCancelResult,
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

      // `outputs` (optional) is the agent-friendly partial-execution selector
      // — array of label strings from the app's `outputs[]`. Server resolves
      // label → node ID(s). Omitted: full workflow runs (default).
      const body: Record<string, unknown> = { inputs: params.inputs };
      if (params.outputs && params.outputs.length > 0) {
        body.outputs = params.outputs;
      }

      return request<ApiEnvelope<ExecutionStarted>>(`${path.pathname}${path.search}`, {
        method: 'POST',
        body,
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

    cancel(runId: string) {
      return request<ApiEnvelope<RunCancelResult>>(
        `/v1/runs/${encodeURIComponent(runId)}/cancel`,
        { method: 'POST' }
      );
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
