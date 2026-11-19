import { describe, expect, it, vi } from "vitest";
import {
  contentAssetId,
  createMapAssetPreparer,
} from "./cloud-backup-map-assets";

const bytes = (text: string) => new TextEncoder().encode(text);
const map = {
  id: "m1",
  assetPath: "maps/m1.webp",
  fogOfWar: { maskPath: "maps/m1_mask.png" },
};

type Io = Parameters<typeof createMapAssetPreparer>[0];

function setup(overrides: Partial<Io> = {}) {
  const files: Record<string, string> = {
    "maps/m1.webp": "background",
    "maps/m1_mask.png": "mask",
  };
  const io = {
    readFile: vi.fn(async (path: string) =>
      path in files ? { bytes: bytes(files[path]), mimeType: "image/x" } : null,
    ),
    isStored: vi.fn(() => false),
    upload: vi.fn(async (_files: Parameters<Io["upload"]>[0]) => true),
    remember: vi.fn((_hashes: Record<string, string>) => {}),
    ...overrides,
  } as Io & {
    upload: ReturnType<typeof vi.fn>;
    remember: ReturnType<typeof vi.fn>;
  };
  return { io, prepare: createMapAssetPreparer(io), files };
}

describe("createMapAssetPreparer", () => {
  it("uploads both files under ids made of the path id and the content hash", async () => {
    const { io, prepare } = setup();
    const assets = await prepare(map);
    expect(assets).toHaveLength(2);
    expect(assets![0].assetId).toMatch(/^maps_m1\.webp--[0-9a-f]{16}$/);
    expect(assets![1]).toMatchObject({
      path: "maps/m1_mask.png",
      mimeType: "image/x",
    });
    expect(io.upload).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(io.upload).mock.calls[0][0].map((f: any) => f.assetId),
    ).toEqual(assets!.map((a) => a.assetId));
    expect(Object.keys(vi.mocked(io.remember).mock.calls[0][0])).toEqual(
      assets!.map((a) => a.assetId),
    );
  });

  it("gives changed bytes a different id", async () => {
    const first = setup();
    const second = setup();
    second.files["maps/m1_mask.png"] = "edited mask";
    const a = await first.prepare(map);
    const b = await second.prepare(map);
    expect(a![0].assetId).toBe(b![0].assetId);
    expect(a![1].assetId).not.toBe(b![1].assetId);
  });

  it("skips files the backup already holds", async () => {
    const { io, prepare } = setup({ isStored: () => true });
    expect(await prepare(map)).toHaveLength(2);
    expect(io.upload).not.toHaveBeenCalled();
    expect(io.remember).not.toHaveBeenCalled();
  });

  it("answers null when a file cannot be read, and uploads nothing", async () => {
    const { io, prepare, files } = setup();
    delete files["maps/m1_mask.png"];
    expect(await prepare(map)).toBeNull();
    expect(io.upload).not.toHaveBeenCalled();
  });

  it("answers null when a read throws or the upload fails", async () => {
    const throwing = setup({
      readFile: vi.fn(async () => {
        throw new Error("denied");
      }),
    });
    expect(await throwing.prepare(map)).toBeNull();
    const failing = setup({ upload: vi.fn(async () => false) });
    expect(await failing.prepare(map)).toBeNull();
    expect(failing.io.remember).not.toHaveBeenCalled();
  });

  it("ignores remote references and answers an empty list for a map with no files", async () => {
    const { io, prepare } = setup();
    expect(
      await prepare({ id: "m2", assetPath: "https://example.com/a.png" }),
    ).toEqual([]);
    expect(io.readFile).not.toHaveBeenCalled();
  });
});

describe("contentAssetId", () => {
  it("uses the first 16 hex characters of the hash", () => {
    expect(contentAssetId("maps/a.png", "0123456789abcdef0123")).toBe(
      "maps_a.png--0123456789abcdef",
    );
  });
});
