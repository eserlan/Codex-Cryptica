import { describe, expect, it, vi } from "vitest";
import { BrowserArtworkCache } from "./browser-artwork-cache";

describe("browser artwork cache", () => {
  it("protects indexed collection files from automatic eviction", async () => {
    const protectedUrl =
      "https://assets.codexcryptica.com/adventure-artwork/protected.webp";
    const ordinaryUrl =
      "https://assets.codexcryptica.com/adventure-artwork/ordinary.webp";
    const remove = vi.fn(async () => true);
    const cache = {
      keys: async () => [{ url: protectedUrl }, { url: ordinaryUrl }],
      match: async (request: { url: string }) => ({
        blob: async () => ({
          size: (request.url === protectedUrl ? 250 : 5) * 1024 * 1024,
        }),
        headers: new Headers(),
      }),
      delete: remove,
      put: vi.fn(async () => {}),
    };
    const store = new BrowserArtworkCache({
      open: async () => cache as never,
      withLock: async (action) => action(),
      protectedUrls: async () => new Set([protectedUrl]),
    });
    await store.write(
      "https://assets.codexcryptica.com/adventure-artwork/new.webp",
      new Blob([new Uint8Array(2 * 1024 * 1024)]),
    );
    expect(remove).toHaveBeenCalledWith(ordinaryUrl);
    expect(remove).not.toHaveBeenCalledWith(protectedUrl);
  });
  it("uses the dedicated namespace and stores a validated blob under a lock", async () => {
    const put = vi.fn(async () => {});
    const cache = {
      keys: vi.fn(async () => []),
      put,
      match: vi.fn(),
      delete: vi.fn(),
    };
    const open = vi.fn(async () => cache);
    const lock = vi.fn(async (action: () => Promise<unknown>) => action());
    const store = new BrowserArtworkCache({ open, withLock: lock } as never);
    await store.write(
      "https://assets.codexcryptica.com/adventure-artwork/a.webp",
      new Blob(["abc"], { type: "image/webp" }),
    );
    expect(open).toHaveBeenCalledWith("codex-adventure-artwork-v1");
    expect(lock).toHaveBeenCalledOnce();
    expect(put).toHaveBeenCalledOnce();
  });
  it("does not write when exclusion is unavailable", async () => {
    const open = vi.fn();
    const store = new BrowserArtworkCache({
      open,
      withLock: async () => {
        throw new Error("unavailable");
      },
    } as never);
    await expect(
      store.write(
        "https://assets.codexcryptica.com/adventure-artwork/a.webp",
        new Blob(["abc"]),
      ),
    ).rejects.toThrow();
    expect(open).not.toHaveBeenCalled();
  });
});

it("updates access time under the lock without dropping collection protection", async () => {
  const put = vi.fn(
    async (_request: RequestInfo | URL, _response: Response) => {},
  );
  const response = new Response(new Blob(["abc"], { type: "image/webp" }), {
    headers: { "x-artwork-protected": "true" },
  });
  const store = new BrowserArtworkCache({
    open: async () =>
      ({ match: async () => response, put }) as unknown as Cache,
    withLock: async (action) => action(),
    now: () => 42,
  });
  await store.touch(
    "https://assets.codexcryptica.com/adventure-artwork/a.webp",
  );
  const saved = put.mock.calls[0][1] as Response;
  expect(saved.headers.get("x-artwork-last-used")).toBe("42");
  expect(saved.headers.get("x-artwork-protected")).toBe("true");
});
