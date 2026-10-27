import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Map } from "schema";

vi.mock("./vault.svelte", () => ({ vault: {} }));
vi.mock("../utils/image-processing", () => ({ convertToWebP: vi.fn() }));
vi.mock("../utils/opfs", () => ({
  writeOpfsFile: vi.fn(),
  deleteOpfsEntry: vi.fn(),
}));

import { MapRecords, BLANK_MAP_SIZE } from "./map-records";
import { convertToWebP } from "../utils/image-processing";
import { writeOpfsFile } from "../utils/opfs";

function setup() {
  const vault = {
    maps: {} as Record<string, Map>,
    getActiveVaultHandle: vi.fn().mockResolvedValue({ name: "vault" }),
    saveMaps: vi.fn().mockResolvedValue(undefined),
    saveMapsWithResult: vi.fn().mockResolvedValue(true),
    releaseImageUrl: vi.fn(),
  };
  const select = vi.fn();
  return {
    vault,
    select,
    records: new MapRecords(select, { uuid: () => "new" }, vault),
  };
}

describe("MapRecords", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates and selects a blank map with its fog path", async () => {
    const { records, vault, select } = setup();
    expect(await records.createBlankMap("Tiles")).toBe("new");
    expect(vault.maps.new).toMatchObject({
      name: "Tiles",
      assetPath: "",
      pins: [],
      dimensions: { width: BLANK_MAP_SIZE, height: BLANK_MAP_SIZE },
      fogOfWar: { maskPath: "maps/new_mask.png" },
    });
    expect(vault.saveMaps).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledWith("new");
  });

  it("does not create a map without an active vault", async () => {
    const { records, vault, select } = setup();
    vault.getActiveVaultHandle.mockResolvedValue(null);
    expect(await records.createBlankMap("Tiles")).toBeUndefined();
    expect(vault.maps).toEqual({});
    expect(select).not.toHaveBeenCalled();
  });

  it("writes an uploaded image before saving and selecting its map", async () => {
    const { records, vault, select } = setup();
    const blob = new Blob(["webp"]);
    vi.mocked(convertToWebP).mockResolvedValue(blob);
    expect(
      await records.uploadMap(new File(["image"], "map.png"), "Dungeon"),
    ).toBe("new");
    expect(writeOpfsFile).toHaveBeenCalledWith(
      ["maps", "new.webp"],
      blob,
      { name: "vault" },
      "vault",
    );
    expect(vault.maps.new.assetPath).toBe("maps/new.webp");
    expect(select).toHaveBeenCalledWith("new");
  });

  it("leaves map records alone when conversion fails", async () => {
    const { records, vault, select } = setup();
    vi.mocked(convertToWebP).mockRejectedValue(new Error("bad image"));
    expect(
      await records.uploadMap(new File([], "bad.png"), "Bad"),
    ).toBeUndefined();
    expect(vault.maps).toEqual({});
    expect(vault.saveMaps).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it("moves the world designation and looks up entity submaps", async () => {
    const { records, vault } = setup();
    await records.createBlankMap("Old");
    vault.maps.old = { ...vault.maps.new, id: "old", isWorldMap: true };
    vault.maps.new.parentEntityId = "entity";
    await records.setAsWorldMap("new");
    expect(vault.maps.old.isWorldMap).toBe(false);
    expect(vault.maps.new.isWorldMap).toBe(true);
    expect(records.getEntitySubMap("entity")).toBe(vault.maps.new);
    expect(records.getEntitySubMap("missing")).toBeUndefined();
  });
});
