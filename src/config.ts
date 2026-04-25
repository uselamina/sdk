import type { LaminaClientOptions } from './types.js';

export const DEFAULT_BASE_URL = 'https://app.uselamina.ai';

export function normalizeBaseUrl(baseUrl?: string): string {
  const value = (baseUrl || DEFAULT_BASE_URL).trim();
  return value.replace(/\/+$/, '');
}

export function resolveFetchImplementation(
  fetchImpl?: typeof globalThis.fetch
): typeof globalThis.fetch {
  if (fetchImpl) {
    return fetchImpl;
  }

  if (typeof globalThis.fetch !== 'function') {
    throw new Error('Global fetch is not available in this runtime');
  }

  return globalThis.fetch.bind(globalThis);
}

export function resolveClientOptions(options: LaminaClientOptions = {}): Required<LaminaClientOptions> {
  return {
    apiKey: options.apiKey || '',
    baseUrl: normalizeBaseUrl(options.baseUrl),
    fetch: resolveFetchImplementation(options.fetch),
  };
}
