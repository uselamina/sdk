import { waitForExecution } from './polling.js';
import type {
  ApiEnvelope,
  ExecutionStarted,
  ExecutionStatus,
  LaminaRequestFn,
  RunExecutionParams,
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
  };
}
