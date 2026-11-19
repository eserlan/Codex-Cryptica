import { describe, expect, it, vi } from "vitest";
import { ArtworkCache } from "./artwork-cache";
const variant = {
  url: "https://assets.codexcryptica.com/adventure-artwork/a.webp",
  mime: "image/webp" as const,
  width: 1,
  height: 1,
  bytes: 12,
  sha256: "a".repeat(64),
};
describe("artwork cache", () => {
  it("returns a validated cached image without a network request", async () => {
    const fetcher = vi.fn();
    const cache = new ArtworkCache({
      read: vi.fn(
        async () => new Blob(["RIFFxxxxWEBP"], { type: "image/webp" }),
      ),
      write: vi.fn(),
      fetch: fetcher,
      digest: vi.fn(async () => variant.sha256),
      dimensions: vi.fn(async () => ({ width: 1, height: 1 })),
    });
    expect(
      (await cache.load(variant, new AbortController().signal))?.size,
    ).toBe(12);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects incorrect cached hashes and non-image network responses", async () => {
    const write = vi.fn();
    const cache = new ArtworkCache({
      read: vi.fn(
        async () => new Blob(["RIFFxxxxWEBP"], { type: "image/webp" }),
      ),
      write,
      fetch: vi.fn(
        async () =>
          new Response("abc", { headers: { "Content-Type": "text/html" } }),
      ),
      digest: vi.fn(async () => "b".repeat(64)),
      dimensions: vi.fn(async () => ({ width: 1, height: 1 })),
    });
    expect(await cache.load(variant, new AbortController().signal)).toBeNull();
    expect(write).not.toHaveBeenCalled();
  });
});

it("aborts a stalled network request after eight seconds", async () => {
  vi.useFakeTimers();
  try {
    let requestSignal: AbortSignal | undefined;
    const cache = new ArtworkCache({
      read: async () => null,
      write: vi.fn(),
      fetch: async (_url, init) =>
        new Promise((_resolve, reject) => {
          requestSignal = init.signal as AbortSignal;
          requestSignal.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        }),
      digest: async () => variant.sha256,
      dimensions: async () => ({ width: 1, height: 1 }),
    });
    const pending = cache.load(variant, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(8000);
    expect(await pending).toBeNull();
    expect(requestSignal?.aborted).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});

it("records usage only after validating cached bytes", async () => {
  const touch = vi.fn(async () => {});
  const cache = new ArtworkCache({
    read: async () => new Blob(["RIFFxxxxWEBP"], { type: "image/webp" }),
    write: vi.fn(),
    touch,
    fetch: vi.fn(),
    digest: async () => variant.sha256,
    dimensions: async () => ({ width: 1, height: 1 }),
  });
  await cache.load(variant, new AbortController().signal);
  expect(touch).toHaveBeenCalledWith(variant.url);
});

it("shares an in-flight request while letting one subscriber cancel", async () => {
  let resolveFetch!: (response: Response) => void;
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
  );
  const cache = new ArtworkCache({
    read: async () => null,
    write: async () => {},
    fetch: fetcher,
    digest: async () => variant.sha256,
    dimensions: async () => ({ width: 1, height: 1 }),
  });
  const cancelled = new AbortController();
  const first = cache.load(variant, cancelled.signal);
  const second = cache.load(variant, new AbortController().signal);
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  cancelled.abort();
  expect(await first).toBeNull();
  resolveFetch(
    new Response(new TextEncoder().encode("RIFFxxxxWEBP"), {
      headers: { "Content-Type": "image/webp" },
    }),
  );
  expect((await second)?.size).toBe(12);
  expect(fetcher).toHaveBeenCalledOnce();
});

it("aborts the shared request after its last subscriber cancels", async () => {
  let requestSignal: AbortSignal | undefined;
  const fetcher = vi.fn(
    async (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        requestSignal = init.signal as AbortSignal;
        requestSignal.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        );
      }),
  );
  const cache = new ArtworkCache({
    read: async () => null,
    write: async () => {},
    fetch: fetcher,
    digest: async () => variant.sha256,
    dimensions: async () => ({ width: 1, height: 1 }),
  });
  const first = new AbortController();
  const second = new AbortController();
  const one = cache.load(variant, first.signal);
  const two = cache.load(variant, second.signal);
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  first.abort();
  expect(requestSignal?.aborted).toBe(false);
  second.abort();
  expect(await Promise.all([one, two])).toEqual([null, null]);
  expect(requestSignal?.aborted).toBe(true);
});

it("rejects non-WebP bytes even when MIME, hash and dimensions appear valid", async () => {
  const cache = new ArtworkCache({
    read: async () => new Blob(["abcdefghijkl"], { type: "image/webp" }),
    write: vi.fn(),
    fetch: async () => new Response("not an image", { status: 404 }),
    digest: async () => variant.sha256,
    dimensions: async () => ({ width: 1, height: 1 }),
  });
  expect(await cache.load(variant, new AbortController().signal)).toBeNull();
});

it("returns on timeout even if cache storage never resolves", async () => {
  vi.useFakeTimers();
  try {
    const cache = new ArtworkCache({
      read: async () => new Promise(() => {}),
      write: vi.fn(),
      fetch: vi.fn(),
      digest: vi.fn(),
      dimensions: vi.fn(),
    });
    const pending = cache.load(variant, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(8000);
    expect(await pending).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});
