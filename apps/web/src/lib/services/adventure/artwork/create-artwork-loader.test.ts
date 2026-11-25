import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createArtworkLoader,
  readProtectedArtworkUrls,
} from "./create-artwork-loader";
import { COLLECTION_INDEX_KEY } from "./collection-storage";
const variant = {
  url: "https://assets.codexcryptica.com/adventure-artwork/a.webp",
  mime: "image/webp" as const,
  bytes: 12,
  width: 1,
  height: 1,
  sha256: "a".repeat(64),
};
describe("artwork loader assembly", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("protects installed artwork URLs from the injected collection index", () => {
    const protectedUrl =
      "https://assets.codexcryptica.com/adventure-artwork/forest.webp";
    const storage = {
      getItem: vi.fn((key: string) =>
        key === COLLECTION_INDEX_KEY
          ? JSON.stringify({
              version: 1,
              collections: {
                forest: [{ id: protectedUrl, bytes: 12 }],
              },
              suppressed: [],
            })
          : null,
      ),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    expect([...readProtectedArtworkUrls(storage)]).toEqual([protectedUrl]);
    expect(storage.getItem).toHaveBeenCalledWith(COLLECTION_INDEX_KEY);
  });

  it("rejects an invalid injected collection index", () => {
    const storage = {
      getItem: () => "invalid json",
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    expect(() => readProtectedArtworkUrls(storage)).toThrow();
  });

  it("fails closed when browser storage cannot read the collection index", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => {
        throw new DOMException("Storage access is blocked", "SecurityError");
      }),
    });

    expect(() => readProtectedArtworkUrls()).toThrow(
      "Storage access is blocked",
    );
  });

  it("uses a validated browser cache hit without fetching", async () => {
    const fetcher = vi.fn();
    const loader = createArtworkLoader({
      open: async () =>
        ({
          match: async () =>
            new Response(new TextEncoder().encode("RIFFxxxxWEBP"), {
              headers: { "Content-Type": "image/webp" },
            }),
        }) as unknown as Cache,
      locks: undefined,
      fetch: fetcher,
      digest: async () => variant.sha256,
      dimensions: async () => ({ width: 1, height: 1 }),
    });
    expect(
      (await loader.load(variant, new AbortController().signal))?.size,
    ).toBe(12);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("returns a valid fetched image without caching when locks are unavailable", async () => {
    const put = vi.fn();
    const loader = createArtworkLoader({
      open: async () =>
        ({ match: async () => undefined, put }) as unknown as Cache,
      locks: undefined,
      fetch: async () =>
        new Response(new TextEncoder().encode("RIFFxxxxWEBP"), {
          headers: { "Content-Type": "image/webp" },
        }),
      digest: async () => variant.sha256,
      dimensions: async () => ({ width: 1, height: 1 }),
    });
    expect(
      (await loader.load(variant, new AbortController().signal))?.size,
    ).toBe(12);
    expect(put).not.toHaveBeenCalled();
  });
});
