import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Map } from "schema";
vi.mock("./vault.svelte", () => ({ vault: {} }));
vi.mock("../utils/opfs", () => ({ writeOpfsFile: vi.fn() }));
import { MapFog } from "./map-fog";
import { writeOpfsFile } from "../utils/opfs";

function setup(path = "maps/map_mask.png") {
  const state = {
    activeMapId: "map" as string | null,
    activeMap: { fogOfWar: { maskPath: path } } as Map | null,
    fogRevision: 0,
  };
  const file = new File(["mask"], "map_mask.png");
  const getFileHandle = vi
    .fn()
    .mockResolvedValue({ getFile: async () => file });
  const dir = {
    name: "vault",
    getDirectoryHandle: vi.fn().mockResolvedValue({ getFileHandle }),
  };
  const vault = {
    getActiveVaultHandle: vi.fn().mockResolvedValue(dir),
    saveQueue: {
      enqueue: vi.fn(async (_key: string, job: () => Promise<void>) => job()),
    },
  };
  // The queue's implementation is irrelevant to fog IO; inject only its enqueue contract.
  const fog = new MapFog(
    state,
    vault as unknown as ConstructorParameters<typeof MapFog>[1],
  );
  return { fog, state, vault, dir, file, getFileHandle };
}

describe("MapFog", () => {
  const ctx = { clearRect: vi.fn(), drawImage: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue("bitmap"));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads a local mask at the requested canvas dimensions", async () => {
    const { fog, file, getFileHandle } = setup();
    const canvas = await fog.loadMask(200, 100);
    expect([canvas.width, canvas.height]).toEqual([200, 100]);
    expect(getFileHandle).toHaveBeenCalledWith("map_mask.png");
    expect(createImageBitmap).toHaveBeenCalledWith(file);
    expect(ctx.drawImage).toHaveBeenCalledWith("bitmap", 0, 0, 200, 100);
  });

  it.each([
    "https://example.com/mask",
    "blob:mask",
    "data:image/png;base64,mask",
  ])("loads remote mask %s", async (path) => {
    const { fog, vault } = setup(path);
    const blob = new Blob(["remote"]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, blob: async () => blob }),
    );
    await fog.loadMask(40, 50);
    expect(fetch).toHaveBeenCalledWith(path);
    expect(createImageBitmap).toHaveBeenCalledWith(blob);
    expect(vault.getActiveVaultHandle).not.toHaveBeenCalled();
  });

  it("returns transparent fog after a failed remote fetch", async () => {
    const { fog } = setup("https://example.com/mask");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const canvas = await fog.loadMask(40, 50);
    expect(canvas.width).toBe(40);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 40, 50);
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("leaves missing local masks transparent", async () => {
    const { fog, getFileHandle } = setup();
    getFileHandle.mockRejectedValue(
      new DOMException("missing", "NotFoundError"),
    );
    await fog.loadMask(40, 50);
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("increments the revision and saves PNG through the vault queue", async () => {
    const { fog, state, vault, dir } = setup();
    const blob = new Blob(["png"]);
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "toBlob").mockImplementation((cb) => cb(blob));
    await fog.saveMask(canvas);
    expect(state.fogRevision).toBe(1);
    expect(vault.saveQueue.enqueue).toHaveBeenCalledWith(
      "mask-map",
      expect.any(Function),
    );
    expect(writeOpfsFile).toHaveBeenCalledWith(
      ["maps", "map_mask.png"],
      blob,
      dir,
      "vault",
    );
  });

  it("does not write when canvas encoding fails or no map is active", async () => {
    const { fog, state } = setup();
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "toBlob").mockImplementation((cb) => cb(null));
    await fog.saveMask(canvas);
    state.activeMap = null;
    await fog.saveMask(canvas);
    expect(state.fogRevision).toBe(2);
    expect(writeOpfsFile).not.toHaveBeenCalled();
  });
});
