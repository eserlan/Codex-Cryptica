/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";

const vaultMock = vi.hoisted(() => ({
  activeVaultId: "vault-a",
  maps: {} as Record<string, any>,
  saveMapsWithResult: vi.fn(),
  getActiveVaultHandle: vi.fn(),
  releaseImageUrl: vi.fn(),
}));

const imageMock = vi.hoisted(() => ({ convertToWebP: vi.fn() }));
const opfsMock = vi.hoisted(() => ({
  writeOpfsFile: vi.fn(),
  deleteOpfsEntry: vi.fn(),
}));

vi.mock("./vault.svelte", () => ({ vault: vaultMock }));
vi.mock("../utils/image-processing", () => imageMock);
vi.mock("../utils/opfs", () => opfsMock);

import { MapStore } from "./map.svelte";

const existingMap = () => ({
  id: "map-1",
  name: "Old Map",
  assetPath: "maps/old.webp",
  dimensions: { width: 4000, height: 3000 },
  pins: [{ id: "pin-1", x: 10, y: 20 }],
  fogOfWar: { maskPath: "maps/map-1_mask.png" },
});

const file = () => new File(["x"], "new.png", { type: "image/png" });

describe("MapStore.replaceMapImage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vaultMock.maps = { "map-1": existingMap() };
    vaultMock.saveMapsWithResult.mockReset();
    vaultMock.saveMapsWithResult.mockResolvedValue(true);
    vaultMock.releaseImageUrl.mockReset();
    vaultMock.getActiveVaultHandle.mockReset();
    vaultMock.getActiveVaultHandle.mockResolvedValue({ name: "vault-a" });
    imageMock.convertToWebP.mockReset();
    imageMock.convertToWebP.mockResolvedValue(new Blob(["webp"]));
    opfsMock.writeOpfsFile.mockReset();
    opfsMock.writeOpfsFile.mockResolvedValue(undefined);
    opfsMock.deleteOpfsEntry.mockReset();
    opfsMock.deleteOpfsEntry.mockResolvedValue(undefined);
  });

  it("points the map at a new image and keeps its pins and fog", async () => {
    const store = new MapStore(undefined, { uuid: () => "new-image-id" });

    const replaced = await store.replaceMapImage("map-1", file());

    expect(replaced).toBe(true);
    expect(opfsMock.writeOpfsFile).toHaveBeenCalledWith(
      ["maps", "new-image-id.webp"],
      expect.any(Blob),
      expect.anything(),
      "vault-a",
    );
    expect(vaultMock.maps["map-1"]).toMatchObject({
      name: "Old Map",
      assetPath: "maps/new-image-id.webp",
      pins: [{ id: "pin-1", x: 10, y: 20 }],
      fogOfWar: { maskPath: "maps/map-1_mask.png" },
    });
    expect(vaultMock.saveMapsWithResult).toHaveBeenCalled();
  });

  it("resets dimensions so they are recomputed from the new image", async () => {
    const store = new MapStore(undefined, { uuid: () => "new-image-id" });

    await store.replaceMapImage("map-1", file());

    expect(vaultMock.maps["map-1"].dimensions).toEqual({ width: 0, height: 0 });
  });

  it("removes the old local image and releases its cached URL", async () => {
    const store = new MapStore(undefined, { uuid: () => "new-image-id" });

    await store.replaceMapImage("map-1", file());

    expect(vaultMock.releaseImageUrl).toHaveBeenCalledWith("maps/old.webp");
    expect(opfsMock.deleteOpfsEntry).toHaveBeenCalledWith(
      expect.anything(),
      ["maps", "old.webp"],
      "vault-a",
    );
  });

  it("does not try to delete an old image that is a remote URL", async () => {
    vaultMock.maps["map-1"].assetPath = "https://example.com/old.png";
    const store = new MapStore(undefined, { uuid: () => "new-image-id" });

    await store.replaceMapImage("map-1", file());

    expect(opfsMock.deleteOpfsEntry).not.toHaveBeenCalled();
    expect(vaultMock.maps["map-1"].assetPath).toBe("maps/new-image-id.webp");
  });

  it("still succeeds when the old file is already gone", async () => {
    opfsMock.deleteOpfsEntry.mockRejectedValue(new Error("gone"));
    const store = new MapStore(undefined, { uuid: () => "new-image-id" });

    await expect(store.replaceMapImage("map-1", file())).resolves.toBe(true);
  });

  it("leaves the map untouched when the file cannot be converted", async () => {
    imageMock.convertToWebP.mockRejectedValue(new Error("not an image"));
    const store = new MapStore(undefined, { uuid: () => "new-image-id" });

    const replaced = await store.replaceMapImage("map-1", file());

    expect(replaced).toBe(false);
    expect(vaultMock.maps["map-1"]).toEqual(existingMap());
    expect(vaultMock.saveMapsWithResult).not.toHaveBeenCalled();
    expect(opfsMock.deleteOpfsEntry).not.toHaveBeenCalled();
  });

  it("leaves the map untouched when writing the new file fails", async () => {
    opfsMock.writeOpfsFile.mockRejectedValue(new Error("disk full"));
    const store = new MapStore(undefined, { uuid: () => "new-image-id" });

    const replaced = await store.replaceMapImage("map-1", file());

    expect(replaced).toBe(false);
    expect(vaultMock.maps["map-1"].assetPath).toBe("maps/old.webp");
  });

  it("keeps the old image when map metadata cannot be saved", async () => {
    vaultMock.saveMapsWithResult.mockResolvedValue(false);
    const store = new MapStore(undefined, { uuid: () => "new-image-id" });

    const replaced = await store.replaceMapImage("map-1", file());

    expect(replaced).toBe(false);
    expect(vaultMock.maps["map-1"]).toEqual(existingMap());
    expect(opfsMock.deleteOpfsEntry).toHaveBeenCalledWith(
      expect.anything(),
      ["maps", "new-image-id.webp"],
      "vault-a",
    );
    expect(opfsMock.deleteOpfsEntry).not.toHaveBeenCalledWith(
      expect.anything(),
      ["maps", "old.webp"],
      "vault-a",
    );
    expect(vaultMock.releaseImageUrl).not.toHaveBeenCalled();
  });

  it("preserves map edits made while a failed metadata save is pending", async () => {
    let resolveSave!: (saved: boolean) => void;
    vaultMock.saveMapsWithResult.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveSave = resolve;
      }),
    );
    const store = new MapStore(undefined, { uuid: () => "new-image-id" });

    const replacement = store.replaceMapImage("map-1", file());
    await vi.waitFor(() =>
      expect(vaultMock.saveMapsWithResult).toHaveBeenCalled(),
    );

    vaultMock.maps["map-1"] = {
      ...vaultMock.maps["map-1"],
      name: "Renamed while saving",
      pins: [...vaultMock.maps["map-1"].pins, { id: "pin-2", x: 30, y: 40 }],
    };
    resolveSave(false);

    await expect(replacement).resolves.toBe(false);
    expect(vaultMock.maps["map-1"]).toMatchObject({
      name: "Renamed while saving",
      assetPath: "maps/old.webp",
      dimensions: { width: 4000, height: 3000 },
      pins: [
        { id: "pin-1", x: 10, y: 20 },
        { id: "pin-2", x: 30, y: 40 },
      ],
    });
  });

  it("fails for an unknown map or without an active vault", async () => {
    const store = new MapStore(undefined, { uuid: () => "new-image-id" });
    expect(await store.replaceMapImage("missing", file())).toBe(false);

    vaultMock.getActiveVaultHandle.mockResolvedValue(undefined);
    expect(await store.replaceMapImage("map-1", file())).toBe(false);
    expect(opfsMock.writeOpfsFile).not.toHaveBeenCalled();
  });
});
