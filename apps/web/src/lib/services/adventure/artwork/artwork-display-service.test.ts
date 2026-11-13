import { describe, expect, it, vi } from "vitest";
import { ArtworkDisplayService } from "./artwork-display-service";
import type { ArtworkAsset } from "@codex/adventure-artwork-engine";

const asset = {
  id: "forest",
  withdrawn: false,
  review: { status: "approved" },
  variants: {
    display: {
      url: "https://assets.codexcryptica.com/adventure-artwork/forest.webp",
      mime: "image/webp",
      bytes: 12,
      width: 1,
      height: 1,
      sha256: "a".repeat(64),
    },
  },
} as unknown as ArtworkAsset;

describe("catalogue artwork display", () => {
  it("loads an approved asset and releases its object URL exactly once", async () => {
    const load = vi.fn(async () => new Blob(["image"]));
    const revoke = vi.fn();
    const service = new ArtworkDisplayService(
      { load },
      { create: () => "blob:art", revoke },
    );
    const handle = await service.load(asset, new AbortController().signal);
    expect(handle?.url).toBe("blob:art");
    expect(load).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(AbortSignal),
      "automatic",
    );
    handle?.release();
    handle?.release();
    expect(revoke).toHaveBeenCalledOnce();
  });
  it("never loads withdrawn artwork or creates an object URL after cancellation", async () => {
    const controller = new AbortController();
    const load = vi.fn(async () => {
      controller.abort();
      return new Blob(["image"]);
    });
    const create = vi.fn();
    const service = new ArtworkDisplayService(
      { load },
      { create, revoke: vi.fn() },
    );
    expect(
      await service.load(
        { ...asset, withdrawn: true },
        new AbortController().signal,
      ),
    ).toBeNull();
    expect(load).not.toHaveBeenCalled();
    expect(await service.load(asset, controller.signal)).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });
  it("returns no image when loading or URL creation fails", async () => {
    const service = new ArtworkDisplayService(
      {
        load: async () => {
          throw new Error("offline");
        },
      },
      { create: () => "blob:art", revoke: vi.fn() },
    );
    expect(await service.load(asset, new AbortController().signal)).toBeNull();
  });
});
