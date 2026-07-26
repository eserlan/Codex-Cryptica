import { describe, it, expect } from "vitest";
import { DelveStockingService } from "./delve-stocking-service";
import type { DelveRoomNodeData } from "./delve-builder-types";

describe("DelveStockingService", () => {
  const sampleRoom: DelveRoomNodeData = {
    id: "room-1-2",
    sectorId: "sec-1",
    sectorName: "Submerged Vaults",
    name: "Vault of the Tide",
    role: "hazard",
    summary: "A flooded chamber with crumbling arches",
    description: "Old stone arches crumbling into black water.",
    stocking: {
      hazards: ["Rising Water Level"],
      atmosphere: "Damp and freezing",
    },
  };

  it("regenerates room stocking deterministically when AI is disabled", async () => {
    const stockingService = new DelveStockingService();
    const updated = await stockingService.regenerateSingleRoom({
      room: sampleRoom,
      conceptLore: "An ancient flooded crypt built by Drowned Cultists.",
      aiDisabled: true,
    });

    expect(updated).toBeDefined();
    expect(updated.id).toBe(sampleRoom.id);
    expect(updated.role).toBe(sampleRoom.role);
    expect(updated.stocking.hazards).toBeDefined();
    expect(updated.stocking.hazards!.length).toBeGreaterThan(0);
  });

  it("preserves room ID, sectorId, and role during single-room regeneration", async () => {
    const stockingService = new DelveStockingService();
    const updated = await stockingService.regenerateSingleRoom({
      room: sampleRoom,
      conceptLore: "Submerged vaults infested with aquatic beasts.",
      aiDisabled: true,
    });

    expect(updated.id).toBe("room-1-2");
    expect(updated.sectorId).toBe("sec-1");
    expect(updated.role).toBe("hazard");
  });
});
