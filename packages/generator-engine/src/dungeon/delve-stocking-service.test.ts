import { describe, it, expect, vi } from "vitest";
import {
  DelveStockingService,
  resolveGeneratedDelveAreaName,
} from "./delve-stocking-service";
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

  it("uses Location canon and nearby Areas for AI enhancement", async () => {
    const modelRunner = vi.fn().mockResolvedValue(`\`\`\`json
      {
        "name": "The Drowned Tithe",
        "description": "Black water laps against votive pillars marked by the Tidebound.",
        "stocking": {
          "atmosphere": "Salt, lamp oil, and whispered counting",
          "encounters": ["A Tidebound quartermaster hiding flooded ledgers"],
          "hazards": ["A sluice gate opens when the third pillar is touched"],
          "treasure": [],
          "secrets": ["The ledgers implicate the Harbor Regent"]
        }
      }
    \`\`\``);
    const stockingService = new DelveStockingService();

    const updated = await stockingService.regenerateSingleRoom({
      room: sampleRoom,
      conceptLore:
        "The Tidebound faction controls the submerged crypt and serves the Harbor Regent.",
      nearbyAreas: "Flooded Nave: guarded by drowned sentries.",
      modelRunner,
      fallbackOnFailure: false,
    });

    expect(modelRunner).toHaveBeenCalledWith(
      expect.stringContaining("supplied Location canon"),
      expect.stringContaining("The Tidebound faction"),
    );
    expect(modelRunner.mock.calls[0][1]).toContain("Flooded Nave");
    expect(modelRunner.mock.calls[0][1]).toContain(
      "Allowed gameplay fields: hazards",
    );
    expect(updated.description).toContain("Tidebound");
    expect(updated.name).toBe("The Drowned Tithe");
    expect(updated.stocking.hazards).toContain(
      "A sluice gate opens when the third pillar is touched",
    );
    expect(updated.stocking.encounters).toBeUndefined();
    expect(updated.stocking.treasure).toBeUndefined();
    expect(updated.stocking.secrets).toBeUndefined();
  });

  it("keeps faction intent and reaction in faction Areas", async () => {
    const factionRoom: DelveRoomNodeData = {
      ...sampleRoom,
      role: "faction",
      stocking: { encounters: [] },
    };
    const modelRunner = vi.fn().mockResolvedValue(
      JSON.stringify({
        name: "The Tidebound Levy",
        description: "The Tidebound collect supplies beside the flooded gate.",
        stocking: {
          atmosphere: "Low voices over black water",
          encounters: ["A tense negotiation with the levy keeper"],
          factionPresence:
            "The Tidebound hold the gate to tax supplies; chains control the sluice, and they bargain before resorting to force.",
        },
      }),
    );

    const updated = await new DelveStockingService().regenerateSingleRoom({
      room: factionRoom,
      conceptLore: "The Tidebound control the submerged gate.",
      modelRunner,
      fallbackOnFailure: false,
    });

    expect(updated.stocking.factionPresence).toContain(
      "bargain before resorting to force",
    );
    expect(modelRunner.mock.calls[0][0]).toContain(
      "Secrets must be information, revelations, evidence, or clues",
    );
    expect(modelRunner.mock.calls[0][0]).toContain(
      "purpose in the Area, defenses or leverage, and likely reaction",
    );
  });

  it("preserves the Area by rejecting instead of applying fallback boilerplate when AI fails", async () => {
    const stockingService = new DelveStockingService();

    await expect(
      stockingService.regenerateSingleRoom({
        room: sampleRoom,
        conceptLore: "The Tidebound control this crypt.",
        modelRunner: vi.fn().mockRejectedValue(new Error("AI unavailable")),
        fallbackOnFailure: false,
      }),
    ).rejects.toThrow("AI unavailable");

    expect(sampleRoom.description).toBe(
      "Old stone arches crumbling into black water.",
    );
  });

  it("lets AI choose only the canon-relevant fields for a climax", async () => {
    const modelRunner = vi.fn().mockResolvedValue(
      JSON.stringify({
        name: "The Unmooring Chain",
        description:
          "The Tidebound must decide whether to release the prison beneath the crypt.",
        climax: {
          stakes:
            "Breaking the chain floods the crypt but frees its bound dead.",
          decision:
            "Preserve the prison, break it, or bind it to a new keeper.",
          outcomes: [
            "The Tidebound retain control and the flooding stops.",
            "The prison opens and the lower crypt is lost.",
          ],
        },
        stocking: {
          atmosphere: "Black water rising around a singing chain",
          hazards: ["Each broken link floods another tier"],
          secrets: ["The Harbor Regent is the prison's last living anchor"],
        },
      }),
    );
    const climaxRoom: DelveRoomNodeData = {
      ...sampleRoom,
      role: "climax",
      stocking: {
        encounters: ["An encounter from the previous draft"],
        hazards: [],
        treasure: [],
        secrets: [],
      },
    };

    const updated = await new DelveStockingService().regenerateSingleRoom({
      room: climaxRoom,
      conceptLore:
        "The Tidebound guard a submerged prison bound to the Harbor Regent.",
      modelRunner,
      fallbackOnFailure: false,
    });

    expect(modelRunner.mock.calls[0][0]).toContain(
      "do not default to a boss fight",
    );
    expect(modelRunner.mock.calls[0][1]).toContain("Role: climax");
    expect(updated.stocking.hazards).toEqual([
      "Each broken link floods another tier",
    ]);
    expect(updated.stocking.secrets).toEqual([
      "The Harbor Regent is the prison's last living anchor",
    ]);
    expect(updated.stocking.encounters).toEqual([]);
    expect(updated.stocking.treasure).toEqual([]);
    expect(updated.climax).toEqual({
      stakes: "Breaking the chain floods the crypt but frees its bound dead.",
      decision: "Preserve the prison, break it, or bind it to a new keeper.",
      outcomes: [
        "The Tidebound retain control and the flooding stops.",
        "The prison opens and the lower crypt is lost.",
      ],
    });
    expect(modelRunner.mock.calls[0][0]).toContain(
      "must reveal, transform, or resolve the central secret",
    );
  });

  it("removes unsupported generic climate modifiers from generated Area names", async () => {
    const updated = await new DelveStockingService().regenerateSingleRoom({
      room: sampleRoom,
      conceptLore: "A flooded crypt beneath a storm-battered harbor.",
      nearbyAreas: "The Drowned Tithe [secret]",
      modelRunner: vi.fn().mockResolvedValue(
        JSON.stringify({
          name: "Temperate Battered Rift",
          description: "A salt-scoured breach descends into black water.",
          stocking: {
            atmosphere: "Cold spray",
            hazards: ["A collapsing ledge"],
          },
        }),
      ),
      fallbackOnFailure: false,
    });

    expect(updated.name).toBe("Battered Rift");
  });

  it("repairs repeated head nouns and mechanical Area names", () => {
    expect(
      resolveGeneratedDelveAreaName("Brittle Rib Vault", {
        sectorName: "The Last Hearth",
        role: "hazard",
        existingNames: ["Marrow-Dripping Vault"],
      }),
    ).toBe("Brittle Rib Peril");
    expect(
      resolveGeneratedDelveAreaName("The Last Hearth - Area 4", {
        sectorName: "The Last Hearth",
        role: "climax",
      }),
    ).toBe("Reckoning");
  });

  it("rejects an unchanged encounter copied into the climax", async () => {
    await expect(
      new DelveStockingService().regenerateSingleRoom({
        room: {
          ...sampleRoom,
          role: "climax",
          stocking: {
            encounters: [],
            hazards: [],
            treasure: [],
            secrets: [],
          },
        },
        conceptLore: "The Tidebound guard a submerged prison.",
        nearbyAreas:
          "Antlered Vault [encounter]\nUsed elements: The antler-crowned monstrosity",
        modelRunner: vi.fn().mockResolvedValue(
          JSON.stringify({
            name: "The Final Chain",
            description: "The prison begins to open.",
            climax: {
              stakes: "The crypt will flood.",
              decision: "Seal or open the prison.",
              outcomes: ["The prison holds.", "The crypt floods."],
            },
            stocking: {
              encounters: ["The antler-crowned monstrosity"],
              atmosphere: "Black water rises",
            },
          }),
        ),
        fallbackOnFailure: false,
      }),
    ).rejects.toThrow("repeated an existing Area detail");
  });
});
