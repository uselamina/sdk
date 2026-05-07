import type { ApiEnvelope, LaminaRequestFn } from './types.js';

export type AssetMediaType = 'image' | 'video' | 'audio';

export interface AssetUploadUrlsRequestFile {
  filename: string;
  mediaType: AssetMediaType;
}

export interface AssetUploadUrlsRequest {
  files: AssetUploadUrlsRequestFile[];
}

export interface AssetUploadEntry {
  filename: string;
  mediaType: AssetMediaType;
  /** Suggested Content-Type to set on the PUT. Caller can override. */
  contentTypeHint: string;
  /** Pre-signed URL — caller PUTs the file bytes here. */
  uploadUrl: string;
  /** The canonical URL to use in subsequent runs once the PUT lands. */
  assetUrl: string;
  assetId: string | null;
  /** ISO timestamp; null when the storage backend doesn't expose one. */
  expiresAt: string | null;
}

export interface AssetUploadUrlsResult {
  uploads: AssetUploadEntry[];
}

/**
 * Source for `client.assets.upload(...)`. One of:
 *   - { path: string }       — Node-only: read from disk via fs.createReadStream
 *   - { data: Blob }         — universal: from a Web Blob/File (browser, Node 20+)
 *   - { data: Uint8Array }   — raw bytes
 *   - { data: ArrayBuffer }  — raw bytes
 *   - { data: ReadableStream } — streaming source (Node 20+, browsers)
 */
export type AssetUploadSource =
  | { path: string }
  | { data: Blob }
  | { data: Uint8Array }
  | { data: ArrayBuffer }
  | { data: ReadableStream<Uint8Array> };

export interface AssetUploadOptions {
  /** Filename to register with the storage backend. Required. */
  filename: string;
  /** image | video | audio. Required — used to pick the right CDN namespace. */
  mediaType: AssetMediaType;
  /** Override the suggested Content-Type for the PUT. */
  contentType?: string;
  /** Source bytes — see `AssetUploadSource`. */
  source: AssetUploadSource;
}

export interface AssetUploadResult {
  /** Canonical URL to pass to runs (e.g. `your_photo_image_url`). */
  url: string;
  assetId: string | null;
  filename: string;
  mediaType: AssetMediaType;
}

export function createAssetsApi(
  request: LaminaRequestFn,
  fetchImpl: typeof globalThis.fetch
) {
  return {
    /**
     * Request pre-signed upload URLs from Lamina. Lower-level — useful when
     * you want to manage the PUT yourself (e.g. an agent shelling out to
     * `curl`). For most callers, `upload()` below does the round-trip.
     */
    async getUploadUrls(params: AssetUploadUrlsRequest) {
      return request<ApiEnvelope<AssetUploadUrlsResult>>('/v1/assets/upload-urls', {
        method: 'POST',
        body: params,
      });
    },

    /**
     * Upload a single file to Lamina's CDN and return its canonical URL.
     *
     * Round-trip:
     *   1. POST /v1/assets/upload-urls — get a pre-signed Mason PUT URL.
     *   2. HTTP PUT the bytes directly to that URL — bypasses Lamina server.
     *   3. Return `{url, assetId, filename, mediaType}`.
     *
     * Use `url` directly as input to subsequent runs (e.g. `your_photo_image_url`).
     */
    async upload(options: AssetUploadOptions): Promise<AssetUploadResult> {
      if (!options || typeof options !== 'object') {
        throw new TypeError('upload(options) requires an options object');
      }
      if (!options.filename || typeof options.filename !== 'string') {
        throw new TypeError('upload(options).filename is required (string)');
      }
      if (!options.mediaType) {
        throw new TypeError(
          'upload(options).mediaType is required ("image" | "video" | "audio")'
        );
      }
      if (!options.source) {
        throw new TypeError('upload(options).source is required');
      }

      // 1. Ask Lamina for a signed URL.
      const envelope = await request<ApiEnvelope<AssetUploadUrlsResult>>(
        '/v1/assets/upload-urls',
        {
          method: 'POST',
          body: {
            files: [{ filename: options.filename, mediaType: options.mediaType }],
          },
        }
      );

      const entry = envelope.data?.uploads?.[0];
      if (!entry) {
        throw new Error('Lamina returned no upload entry for the requested file.');
      }

      // 2. Resolve the source into a fetch-acceptable body and pick a Content-Type.
      const { body, contentType } = await resolveSourceForPut(
        options.source,
        options.contentType || entry.contentTypeHint
      );

      // 3. PUT bytes directly to the storage backend. Bytes never go through
      //    Lamina's server, so file size is bounded only by the storage
      //    backend's signed-URL policy.
      const putResponse = await fetchImpl(entry.uploadUrl, {
        method: 'PUT',
        body,
        headers: { 'Content-Type': contentType },
      });
      if (!putResponse.ok) {
        const errText = await putResponse.text().catch(() => '');
        throw new Error(
          `Asset upload PUT failed: ${putResponse.status} ${putResponse.statusText}` +
            (errText ? ` — ${errText.slice(0, 240)}` : '')
        );
      }

      return {
        url: entry.assetUrl,
        assetId: entry.assetId,
        filename: entry.filename || options.filename,
        mediaType: options.mediaType,
      };
    },
  };
}

/**
 * Convert any supported source into a fetch-compatible body + content-type.
 * Reads from disk lazily for the `{path}` source so the SDK stays
 * browser-safe at module load (no top-level `fs` import).
 */
async function resolveSourceForPut(
  source: AssetUploadSource,
  contentType: string
): Promise<{ body: BodyInit; contentType: string }> {
  if ('path' in source) {
    // Node-only branch — load `fs` dynamically to keep the browser bundle clean.
    const fs = await import('node:fs/promises');
    const data = await fs.readFile(source.path);
    // Cast: Uint8Array is accepted by fetch at runtime in every supported
    // engine, but TypeScript's BodyInit type doesn't include it directly.
    return {
      body: new Uint8Array(data.buffer, data.byteOffset, data.byteLength) as unknown as BodyInit,
      contentType,
    };
  }
  if ('data' in source) {
    const d = source.data;
    if (d instanceof Blob) {
      return { body: d, contentType: d.type || contentType };
    }
    if (d instanceof Uint8Array) {
      return { body: d as unknown as BodyInit, contentType };
    }
    if (d instanceof ArrayBuffer) {
      return { body: new Uint8Array(d) as unknown as BodyInit, contentType };
    }
    // ReadableStream — fetch supports streaming bodies in Node 20+ and modern browsers.
    return { body: d as unknown as BodyInit, contentType };
  }
  throw new TypeError(
    'upload(options).source must be { path } or { data: Blob | Uint8Array | ArrayBuffer | ReadableStream }'
  );
}
