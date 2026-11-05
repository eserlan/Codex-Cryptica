import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalImageNetwork } from "./external-image-network";
import { ExternalImageFiles } from "./external-image-files";
import type { IAssetIOAdapter, ImageProbe } from "./asset-types";

function setup(probe?: ImageProbe) {
  const root = { name: "vault" } as FileSystemDirectoryHandle;
  const io: IAssetIOAdapter = {
    readOpfsBlob: vi.fn().mockRejectedValue(new Error("missing")),
    writeOpfsFile: vi.fn().mockResolvedValue(undefined),
    getDirectoryHandle: vi.fn().mockResolvedValue(root),
    isNotFoundError: vi.fn(),
  };
  let now = 1000;
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue({
    ok: true,
    blob: async () => new Blob(["image"]),
  } as Response);
  const dead = vi.fn();
  const network = new ExternalImageNetwork(
    new ExternalImageFiles(io),
    fetcher,
    { now: () => now },
    dead,
    probe,
  );
  return {
    root,
    io,
    fetcher,
    network,
    dead,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("ExternalImageNetwork", () => {
  it("fetches with CORS and reports permanent failures only once", async () => {
    const { root, fetcher, network, dead } = setup();
    expect(await network.fetchExternal("https://host/ok", root)).toBeInstanceOf(
      Blob,
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://host/ok",
      expect.objectContaining({
        mode: "cors",
        signal: expect.any(AbortSignal),
      }),
    );
    fetcher.mockResolvedValue({ ok: false, status: 410 } as Response);
    expect(await network.fetchExternal("https://host/gone", root)).toBeNull();
    expect(await network.fetchExternal("https://host/gone", root)).toBeNull();
    expect(dead).toHaveBeenCalledExactlyOnceWith("https://host/gone");
    expect(network.isDeadExternal("https://host/gone")).toBe(true);
    network.clear();
    expect(network.isDeadExternal("https://host/gone")).toBe(false);
  });

  it("retries temporary failures after five minutes", async () => {
    const { fetcher, network, advance } = setup();
    fetcher.mockRejectedValueOnce(new Error("offline"));
    expect(await network.fetchExternal("https://host/retry")).toBeNull();
    expect(await network.fetchExternal("https://host/retry")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    advance(5 * 60_000);
    expect(await network.fetchExternal("https://host/retry")).toBeInstanceOf(
      Blob,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("lets the host scout learn CORS policy before other images fetch", async () => {
    const { root, fetcher, network, io } = setup(async () => "loaded");
    fetcher.mockRejectedValue(new TypeError("CORS"));
    expect(
      await Promise.all([
        network.fetchFromHost(root, "https://host/one"),
        network.fetchFromHost(root, "https://host/two"),
      ]),
    ).toEqual([null, null]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(io.writeOpfsFile).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringMatching(/\.nocors$/)]),
      "1000",
      root,
      "vault",
    );
  });

  it("expires in-session and persistent unreachable markers and rejects future times", async () => {
    const { root, io, network, advance } = setup(async () => "failed");
    await network.markUnreachable(root, "https://host/image");
    expect(network.isFreshInSession("https://host/image")).toBe(true);
    advance(24 * 60 * 60_000);
    expect(network.isFreshInSession("https://host/image")).toBe(false);
    vi.mocked(io.readOpfsBlob).mockResolvedValue(new Blob(["1000"]));
    expect(await network.isMarkedUnreachable(root, "https://host/image")).toBe(
      false,
    );
    vi.mocked(io.readOpfsBlob).mockResolvedValue(new Blob(["9999999999999"]));
    expect(await network.isMarkedUnreachable(root, "https://host/future")).toBe(
      false,
    );
  });
  it.each(["loaded", "failed"] as const)(
    "probes an opaque failure using the browser image's %s event",
    async (result) => {
      vi.stubGlobal(
        "Image",
        class {
          onload: (() => void) | null = null;
          onerror: (() => void) | null = null;
          set src(_url: string) {
            queueMicrotask(() =>
              result === "loaded" ? this.onload?.() : this.onerror?.(),
            );
          }
        },
      );
      const { root, fetcher, network, io } = setup();
      fetcher.mockRejectedValue(new TypeError("CORS"));
      expect(
        await network.fetchExternal("https://host/image", root),
      ).toBeNull();
      expect(network.cannotBeLoadedAtAll("https://host/image")).toBe(
        result === "failed",
      );
      expect(io.writeOpfsFile).toHaveBeenCalledTimes(
        result === "loaded" ? 1 : 0,
      );
    },
  );

  it("treats an image probe timeout as unknown rather than a permanent failure", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "Image",
      class {
        src = "";
      },
    );
    const { root, fetcher, network } = setup();
    fetcher.mockRejectedValue(new TypeError("CORS"));
    const pending = network.fetchExternal("https://host/slow", root);
    await vi.advanceTimersByTimeAsync(8_000);
    expect(await pending).toBeNull();
    expect(network.cannotBeLoadedAtAll("https://host/slow")).toBe(false);
    expect(network.isDeadExternal("https://host/slow")).toBe(false);
  });
});
