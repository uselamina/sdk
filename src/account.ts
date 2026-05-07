import type { AccountResponse, ApiEnvelope, LaminaRequestFn } from './types.js';

/**
 * Account / identity API. Backs `lamina whoami` and the post-login
 * confirmation in `lamina login`.
 */
export function createAccountApi(request: LaminaRequestFn) {
  return {
    /**
     * Identity for the current API key:
     *  - `user`        — the human (id, email)
     *  - `workspace`   — the workspace this key is scoped to
     *  - `memberships` — every workspace the user belongs to (incl. active)
     */
    get() {
      return request<ApiEnvelope<AccountResponse>>('/v1/account');
    },
  };
}
