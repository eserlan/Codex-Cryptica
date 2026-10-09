/**
 * In-memory R2 stand-in, following the convention in
 * `template-directory.performance.test.ts` — no network, no wrangler.
 *
 * Also counts operations (so tests can assert an R2 budget, which wall time on
 * an in-memory bucket cannot show) and supports etag-conditional writes.
 */
export class Bucket {
  store = new Map<
    string,
    {
      body: string | Uint8Array;
      etag: string;
      customMetadata?: Record<string, string>;
      httpMetadata?: { contentType?: string };
    }
  >();

  ops = { get: 0, head: 0, put: 0, delete: 0, list: 0 };
  private version = 0;
  private conflictsToInject = 0;

  resetOps() {
    this.ops = { get: 0, head: 0, put: 0, delete: 0, list: 0 };
  }

  totalOps() {
    const o = this.ops;
    return o.get + o.head + o.put + o.delete + o.list;
  }

  /** Makes the next `count` conditional puts fail as if another writer won. */
  injectConflicts(count = 1) {
    this.conflictsToInject = count;
  }

  async put(
    key: string,
    body: string | Uint8Array,
    options?: {
      customMetadata?: Record<string, string>;
      httpMetadata?: { contentType?: string };
      onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string };
    },
  ) {
    this.ops.put++;
    if (options?.onlyIf && this.conditionFails(key, options.onlyIf))
      return null;
    const etag = `etag-${++this.version}`;
    this.store.set(key, {
      body,
      etag,
      customMetadata: options?.customMetadata,
      httpMetadata: options?.httpMetadata,
    });
    return { etag };
  }

  /** True when an etag-conditional write must be refused. */
  private conditionFails(
    key: string,
    onlyIf: { etagMatches?: string; etagDoesNotMatch?: string },
  ): boolean {
    if (this.conflictsToInject > 0) {
      this.conflictsToInject--;
      return true;
    }
    const existing = this.store.get(key);
    if (
      onlyIf.etagMatches !== undefined &&
      existing?.etag !== onlyIf.etagMatches
    ) {
      return true;
    }
    // `etagDoesNotMatch: "*"` means "only create": fail if the key exists.
    return onlyIf.etagDoesNotMatch === "*" && Boolean(existing);
  }

  async get(key: string) {
    this.ops.get++;
    const item = this.store.get(key);
    if (!item) return null;
    return {
      text: async () =>
        typeof item.body === "string"
          ? item.body
          : new TextDecoder().decode(item.body),
      body: item.body,
      etag: item.etag,
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
    this.ops.head++;
    const item = this.store.get(key);
    return item
      ? {
          customMetadata: item.customMetadata,
          etag: item.etag,
          size: this.sizeOf(key),
        }
      : null;
  }

  async list({
    prefix,
    limit,
    cursor,
  }: {
    prefix: string;
    limit?: number;
    cursor?: string;
  }) {
    this.ops.list++;
    const keys = [...this.store.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort();
    const start = cursor ? Number(cursor) || 0 : 0;
    const capped =
      typeof limit === "number"
        ? keys.slice(start, start + limit)
        : keys.slice(start);
    const truncated = typeof limit === "number" && keys.length > start + limit;
    return {
      objects: capped.map((key) => ({
        key,
        size: this.sizeOf(key),
        customMetadata: this.store.get(key)?.customMetadata,
      })),
      truncated,
      cursor: truncated ? String(start + (limit as number)) : undefined,
    };
  }

  async delete(key: string) {
    this.ops.delete++;
    this.store.delete(key);
  }
}
