import type {
  ApiEnvelope,
  ConnectedChannel,
  LaminaRequestFn,
  PublishHistoryItem,
  PublishHistoryParams,
  PublishParams,
  PublishResult,
  TransferAssetParams,
  TransferAssetResult,
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

export function createPublishingApi(request: LaminaRequestFn) {
  return {
    channels() {
      return request<ApiEnvelope<ConnectedChannel[]>>('/v1/publishing/channels');
    },

    publish(params: PublishParams) {
      return request<ApiEnvelope<PublishResult>>('/v1/publishing/publish', {
        method: 'POST',
        body: params,
      });
    },

    transferAsset(params: TransferAssetParams) {
      return request<ApiEnvelope<TransferAssetResult>>('/v1/publishing/transfer-asset', {
        method: 'POST',
        body: params,
      });
    },

    history(params: PublishHistoryParams = {}) {
      return request<ApiEnvelope<PublishHistoryItem[]>>(
        buildQueryPath('/v1/publishing/history', params)
      );
    },
  };
}
