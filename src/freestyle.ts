import type {
  ApiEnvelope,
  ExecutionStatus,
  LaminaRequestFn,
  WaitForExecutionOptions,
} from './types.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTerminalStatus(status: string): boolean {
  return status === 'completed' || status === 'failed';
}

async function waitForFreestyleRun(
  request: LaminaRequestFn,
  runId: string,
  options: WaitForExecutionOptions = {},
): Promise<ApiEnvelope<ExecutionStatus>> {
  const intervalMs = options.intervalMs ?? 5000;
  const timeoutMs = options.timeoutMs ?? 30 * 60 * 1000;
  const startedAt = Date.now();

  for (;;) {
    const payload = await request<ApiEnvelope<ExecutionStatus>>(
      `/v1/freestyle/${encodeURIComponent(runId)}`,
    );

    options.onPoll?.(payload.data);

    if (isTerminalStatus(payload.data.status)) {
      return payload;
    }

    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(
        `Timed out waiting for freestyle run ${runId} after ${timeoutMs}ms`,
      );
    }

    await sleep(intervalMs);
  }
}

export function createFreestyleApi(request: LaminaRequestFn) {
  return {
    get(runId: string) {
      return request<ApiEnvelope<ExecutionStatus>>(
        `/v1/freestyle/${encodeURIComponent(runId)}`,
      );
    },

    wait(runId: string, options: WaitForExecutionOptions = {}) {
      return waitForFreestyleRun(request, runId, options);
    },
  };
}
