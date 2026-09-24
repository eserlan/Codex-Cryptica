/**
 * In-memory R2 stand-in, following the convention in
 * `template-directory.performance.test.ts` — no network, no wrangler.
 */
export class Bucket {
  store = new Map<
    string,
    {
      body: string | Uint8Array;
      customMetadata?: Record<string, string>;
      httpMetadata?: { contentType?: string };
    }
  >();

  async put(
    key: string,
    body: string | Uint8Array,
    options?: {
      customMetadata?: Record<string, string>;
      httpMetadata?: { contentType?: string };
    },
  ) {
    this.store.set(key, {
      body,
      customMetadata: options?.customMetadata,
      httpMetadata: options?.httpMetadata,
    });
  }

  async get(key: string) {
    const item = this.store.get(key);
    if (!item) return null;
    return {
      text: async () =>
        typeof item.body === "string"
          ? item.body
          : new TextDecoder().decode(item.body),
      body: item.body,
      customMetadata: item.customMetadata,
      httpMetadata: item.httpMetadata,
    };
  }

  private sizeOf(key: string): number {
    const body = this.store.get(key)?.body;
    if (body === undefined) return 0;
    return typeof body === "string"
      ? new TextEncoder().encode(body).length
      : body.byteLength;
  }

  async head(key: string) {
    const item = this.store.get(key);
    return item
      ? { customMetadata: item.customMetadata, size: this.sizeOf(key) }
      : null;
  }

  async list({ prefix, limit }: { prefix: string; limit?: number }) {
    const keys = [...this.store.keys()].filter((key) => key.startsWith(prefix));
    const capped = typeof limit === "number" ? keys.slice(0, limit) : keys;
    return {
      objects: capped.map((key) => ({
        key,
        size: this.sizeOf(key),
        customMetadata: this.store.get(key)?.customMetadata,
      })),
      truncated: typeof limit === "number" && keys.length > limit,
      cursor: undefined,
    };
  }

  async delete(key: string) {
    this.store.delete(key);
  }
}
