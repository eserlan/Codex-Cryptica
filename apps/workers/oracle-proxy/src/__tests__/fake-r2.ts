/** Test-only in-memory R2 with the compare-and-set conditions the workers rely on. */
export function fakeBucket() {
  const store = new Map<string, { text: string; etag: string }>();
  let version = 0;
  return {
    store,
    async get(key: string) {
      const hit = store.get(key);
      if (!hit) return null;
      return { etag: hit.etag, text: async () => hit.text };
    },
    async put(
      key: string,
      body: string,
      options?: {
        onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string };
      },
    ) {
      const current = store.get(key);
      const onlyIf = options?.onlyIf;
      if (
        onlyIf?.etagMatches !== undefined &&
        current?.etag !== onlyIf.etagMatches
      )
        return null;
      if (onlyIf?.etagDoesNotMatch === "*" && current) return null;
      version += 1;
      const etag = `e${version}`;
      store.set(key, { text: body, etag });
      return { etag };
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
}
