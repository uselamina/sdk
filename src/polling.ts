import type { ApiEnvelope, ExecutionStatus, LaminaRequestFn, WaitForExecutionOptions } from './types.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTerminalStatus(status: string): boolean {
  return status === 'completed' || status === 'failed';
}

export async function waitForExecution(
  request: LaminaRequestFn,
  runId: string,
  options: WaitForExecutionOptions = {}
): Promise<ApiEnvelope<ExecutionStatus>> {
  const intervalMs = options.intervalMs ?? 5000;
  const timeoutMs = options.timeoutMs ?? 30 * 60 * 1000;
  const startedAt = Date.now();

  for (;;) {
    const payload = await request<ApiEnvelope<ExecutionStatus>>(
      `/v1/runs/${encodeURIComponent(runId)}`
    );

    options.onPoll?.(payload.data);

    if (isTerminalStatus(payload.data.status)) {
      return payload;
    }

    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(
        `Timed out waiting for execution ${runId} after ${timeoutMs}ms`
      );
    }

    await sleep(intervalMs);
  }
}
