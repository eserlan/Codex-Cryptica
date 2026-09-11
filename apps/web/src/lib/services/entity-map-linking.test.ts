import { describe, it, expect, vi } from "vitest";
import { EntityMapLinkingService } from "./entity-map-linking";

describe("EntityMapLinkingService", () => {
  it("uploads the image and links the resulting map to the entity", async () => {
    const mapStore = { uploadMap: vi.fn().mockResolvedValue("map1") };
    const vault = {
      maps: { map1: {} } as Record<string, { parentEntityId?: string }>,
      saveMaps: vi.fn().mockResolvedValue(undefined),
    };
    const service = new EntityMapLinkingService(mapStore as any, vault as any);
    const file = new File(["bytes"], "diagram.png", { type: "image/png" });

    const mapId = await service.linkImageToEntity(file, "Kesh-9 Map", "e1");

    expect(mapStore.uploadMap).toHaveBeenCalledWith(file, "Kesh-9 Map");
    expect(vault.maps.map1.parentEntityId).toBe("e1");
    expect(vault.saveMaps).toHaveBeenCalledOnce();
    expect(mapId).toBe("map1");
  });

  it("returns undefined without touching the vault when upload fails", async () => {
    const mapStore = { uploadMap: vi.fn().mockResolvedValue(undefined) };
    const vault = { maps: {}, saveMaps: vi.fn() };
    const service = new EntityMapLinkingService(mapStore as any, vault as any);
    const file = new File(["bytes"], "diagram.png", { type: "image/png" });

    const mapId = await service.linkImageToEntity(file, "Map", "e1");

    expect(mapId).toBeUndefined();
    expect(vault.saveMaps).not.toHaveBeenCalled();
  });

  it("does nothing if the uploaded map id isn't in the vault's maps yet", async () => {
    const mapStore = { uploadMap: vi.fn().mockResolvedValue("missing-id") };
    const vault = { maps: {}, saveMaps: vi.fn() };
    const service = new EntityMapLinkingService(mapStore as any, vault as any);
    const file = new File(["bytes"], "diagram.png", { type: "image/png" });

    const mapId = await service.linkImageToEntity(file, "Map", "e1");

    expect(mapId).toBe("missing-id");
    expect(vault.saveMaps).not.toHaveBeenCalled();
  });
});
