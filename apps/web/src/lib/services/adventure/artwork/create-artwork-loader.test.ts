import { describe, expect, it, vi } from "vitest";
import { createArtworkLoader } from "./create-artwork-loader";
const variant = {
  url: "https://assets.codexcryptica.com/adventure-artwork/a.webp",
  mime: "image/webp" as const,
  bytes: 12,
  width: 1,
  height: 1,
  sha256: "a".repeat(64),
};
describe("artwork loader assembly", () => {
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
