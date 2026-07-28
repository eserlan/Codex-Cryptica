import { describe, expect, it, vi } from "vitest";
import type { Canvas } from "@codex/canvas-engine";
import type { DelveRoomNodeData } from "generator-engine";
import {
  DelveAreaEnhancementService,
  isPlaceholderDelveAreaName,
} from "./delve-area-enhancement";

const room: DelveRoomNodeData = {
  id: "room-1",
  sectorId: "sector-1",
  sectorName: "Deep Vault",
  name: "The Brass Sluice",
  role: "faction",
  summary: "A guarded water control chamber.",
  description: "A mechanical chamber.",
  stocking: {
    encounters: ["An Ember Compact guard detail"],
  },
};

const canvas = {
  nodes: [],
  edges: [],
  metadata: { sourceEntityId: "location-1" },
} as Canvas;

describe("DelveAreaEnhancementService", () => {
  it("grounds the AI request in the source Location and nearby Areas", async () => {
    const vaultGateway = {
      entities: {
        "location-1": {
          id: "location-1",
          type: "location",
          title: "The Brass Bastion",
          labels: ["delve", "dwarven"],
          content: "The Ember Compact controls the fortress waterworks.",
          lore: "Their rival, the Ash Choir, sabotaged the lower cistern.",
          connections: [
            {
              target: "faction-ember-compact",
              type: "part_of",
              label: "Occupied by",
            },
          ],
        },
        "faction-ember-compact": {
          id: "faction-ember-compact",
          type: "faction",
          title: "The Ember Compact",
          labels: ["bandits"],
          content:
            "Bandit engineers command bound ash fiends in the waterworks.",
          lore: "They never employ goblins.",
          connections: [],
        },
        "creature-goblins": {
          id: "creature-goblins",
          type: "creature",
          title: "Goblins of the North Road",
          content: "These goblins raid distant caravans.",
          connections: [],
        },
      },
      loadEntityContent: vi.fn().mockResolvedValue(undefined),
    };
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            name: "The Ember Tally",
            description:
              "Compact valves surround a shrine where the Ember Compact records every ration.",
            stocking: {
              atmosphere: "Hot brass and rationed steam",
              encounters: ["An Ember Compact tally-master and two guards"],
              hazards: [],
              treasure: [],
              secrets: ["Ash Choir scoring marks identify a weakened valve"],
            },
          }),
      },
    });
    const aiClient = {
      getModel: vi.fn().mockResolvedValue({ generateContent }),
    };
    const service = new DelveAreaEnhancementService(
      vaultGateway as never,
      aiClient,
      { effectiveApiKey: null, modelName: "test-model" },
      undefined,
      { now: () => 1234 },
    );

    const enhanced = await service.enhanceArea({
      canvas,
      room,
      nearbyAreas: [
        {
          ...room,
          id: "room-2",
          name: "Collapsed Cistern",
          role: "hazard",
          description: "The Ash Choir broke its main feed.",
        },
      ],
    });

    expect(vaultGateway.loadEntityContent).toHaveBeenCalledWith("location-1");
    expect(aiClient.getModel).toHaveBeenCalledWith(
      "",
      "test-model",
      expect.stringContaining("Location canon"),
    );
    const request = generateContent.mock.calls[0][0];
    expect(request.contents[0].parts[0].text).toContain("Ember Compact");
    expect(request.contents[0].parts[0].text).toContain("Collapsed Cistern");
    expect(request.contents[0].parts[0].text).toContain(
      "Bandit engineers command bound ash fiends",
    );
    expect(request.contents[0].parts[0].text).toContain(
      "Relation: part_of (Occupied by)",
    );
    expect(request.contents[0].parts[0].text).not.toContain(
      "Goblins of the North Road",
    );
    expect(request.contents[0].parts[0].text).toContain(
      "Allowed gameplay fields: encounters",
    );
    expect(vaultGateway.loadEntityContent).toHaveBeenCalledWith(
      "faction-ember-compact",
    );
    expect(aiClient.getModel.mock.calls[0][2]).toContain(
      "closed roster of factions, peoples, and creatures",
    );
    expect(enhanced.description).toContain("Ember Compact");
    expect(enhanced.name).toBe("The Ember Tally");
    expect(enhanced.stocking.encounters).toContain(
      "An Ember Compact tally-master and two guards",
    );
    expect(enhanced.stocking.hazards).toBeUndefined();
    expect(enhanced.stocking.treasure).toBeUndefined();
    expect(enhanced.stocking.secrets).toBeUndefined();
  });

  it("rejects without changing the Area when the source Location is unavailable", async () => {
    const service = new DelveAreaEnhancementService(
      {
        entities: {},
        loadEntityContent: vi.fn().mockResolvedValue(undefined),
      },
      { getModel: vi.fn() },
      { effectiveApiKey: null, modelName: "test-model" },
    );

    await expect(
      service.enhanceArea({ canvas, room, nearbyAreas: [] }),
    ).rejects.toThrow("source Location could not be found");
    expect(room.description).toBe("A mechanical chamber.");
  });

  it("populates a whole sector in one request and reports progress", async () => {
    const sectorRooms = [
      room,
      {
        ...room,
        id: "room-2",
        name: "The Scalding Conduit",
        role: "hazard" as const,
        stocking: {
          hazards: ["A ruptured steam pipe"],
        },
      },
      {
        ...room,
        id: "room-3",
        name: "Deep Vault - Area 3",
        role: "climax" as const,
        stocking: {
          encounters: [],
          hazards: [],
          treasure: [],
          secrets: [],
        },
      },
    ];
    const bulkCanvas = {
      ...canvas,
      nodes: sectorRooms.map((area, index) => ({
        id: area.id,
        type: "delveRoom" as const,
        position: { x: index * 100, y: 0 },
        data: area,
      })),
    };
    const vaultGateway = {
      entities: {
        "location-1": {
          id: "location-1",
          type: "location",
          title: "The Brass Bastion",
          content: "The Ember Compact controls the fortress.",
          lore: "The Ash Choir seeks its ledgers.",
        },
      },
      loadEntityContent: vi.fn().mockResolvedValue(undefined),
    };
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            areas: sectorRooms.map((area) => ({
              id: area.id,
              name: "The Cinder Ledger",
              description: `${area.name} bears the marks of the Ember Compact.`,
              stocking:
                area.role === "climax"
                  ? {
                      atmosphere:
                        "The fortress shudders around the final valve",
                      hazards: ["The sabotaged cistern begins to collapse"],
                      secrets: ["The Ash Choir intended to flood the vault"],
                    }
                  : {
                      atmosphere: "Brass dust and banked coals",
                      encounters: ["An Ember Compact inspector"],
                      hazards: ["A valve releases a scalding steam jet"],
                      treasure: ["A purse of stamped brass coins"],
                      secrets: ["Ash Choir cipher scratches"],
                    },
              climax:
                area.role === "climax"
                  ? {
                      stakes:
                        "The final valve will either save or drown the fortress.",
                      decision:
                        "Open the valve, seal it, or surrender it to a faction.",
                      outcomes: [
                        "The Ember Compact saves the upper fortress.",
                        "The Ash Choir floods the occupied vaults.",
                      ],
                    }
                  : undefined,
            })),
          }),
      },
    });
    const getModel = vi.fn().mockResolvedValue({ generateContent });
    const service = new DelveAreaEnhancementService(
      vaultGateway as never,
      { getModel },
      { effectiveApiKey: null, modelName: "test-model" },
      undefined,
      { now: () => 1234 },
    );
    const onProgress = vi.fn();

    const result = await service.populateAllAreas(bulkCanvas, onProgress);

    expect(generateContent).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ completed: 3, total: 3, failed: 0 });
    expect(result.nodes[0].data).toMatchObject({
      name: "The Cinder Ledger",
      description: "The Brass Sluice bears the marks of the Ember Compact.",
      stocking: {
        encounters: ["An Ember Compact inspector"],
      },
      aiEnhancedAt: 1234,
    });
    expect(
      (result.nodes[0].data as unknown as DelveRoomNodeData).stocking.hazards,
    ).toBeUndefined();
    expect(
      (result.nodes[0].data as unknown as DelveRoomNodeData).stocking.treasure,
    ).toBeUndefined();
    expect(
      (result.nodes[0].data as unknown as DelveRoomNodeData).stocking.secrets,
    ).toBeUndefined();
    expect(
      (result.nodes[1].data as unknown as DelveRoomNodeData).stocking.hazards,
    ).toEqual(["A valve releases a scalding steam jet"]);
    expect((result.nodes[1].data as unknown as DelveRoomNodeData).name).toBe(
      "The Cinder Peril",
    );
    expect(
      (result.nodes[1].data as unknown as DelveRoomNodeData).stocking
        .encounters,
    ).toBeUndefined();
    const climax = result.nodes[2].data as unknown as DelveRoomNodeData;
    expect(climax.stocking.hazards).toEqual([
      "The sabotaged cistern begins to collapse",
    ]);
    expect(climax.stocking.secrets).toEqual([
      "The Ash Choir intended to flood the vault",
    ]);
    expect(climax.stocking.encounters).toEqual([]);
    expect(climax.stocking.treasure).toEqual([]);
    expect(climax.climax).toEqual({
      stakes: "The final valve will either save or drown the fortress.",
      decision: "Open the valve, seal it, or surrender it to a faction.",
      outcomes: [
        "The Ember Compact saves the upper fortress.",
        "The Ash Choir floods the occupied vaults.",
      ],
    });
    const request = generateContent.mock.calls[0][0];
    expect(request.contents[0].parts[0].text).toContain(
      '"allowedStockingFields": [\n      "encounters"\n    ]',
    );
    expect(request.contents[0].parts[0].text).toContain(
      '"allowedStockingFields": [\n      "hazards"\n    ]',
    );
    expect(request.contents[0].parts[0].text).toContain('"role": "climax"');
    expect(getModel.mock.calls[0][2]).toContain(
      "never default automatically to a boss fight",
    );
    expect(getModel.mock.calls[0][2]).toContain(
      "must reveal, transform, or resolve the central secret",
    );
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ completed: 3, total: 3 }),
    );
  });

  it("recognizes generated Area placeholders without replacing real names", () => {
    expect(
      isPlaceholderDelveAreaName({
        name: "Deep Vault - Area 2",
        sectorName: "Deep Vault",
      }),
    ).toBe(true);
    expect(
      isPlaceholderDelveAreaName({
        name: "Deep Vault — Area 2",
        sectorName: "Deep Vault",
      }),
    ).toBe(true);
    expect(
      isPlaceholderDelveAreaName({
        name: "The Drowned Tithe",
        sectorName: "Deep Vault",
      }),
    ).toBe(false);
  });

  it("replaces mechanical passages with canon-specific routes", async () => {
    const populatedRooms = [
      { ...room, aiEnhancedAt: 1234 },
      {
        ...room,
        id: "room-2",
        name: "Ash Choir Cistern",
        aiEnhancedAt: 1234,
      },
    ];
    const passageCanvas = {
      ...canvas,
      nodes: populatedRooms.map((area) => ({
        id: area.id,
        type: "delveRoom" as const,
        position: { x: 0, y: 0 },
        data: area,
      })),
      edges: [
        {
          id: "edge-1",
          source: "room-1",
          target: "room-2",
          type: "delveEdge" as const,
          data: {
            id: "edge-1",
            sourceRoomId: "room-1",
            targetRoomId: "room-2",
            type: "conditional" as const,
            bidirectional: true,
            description: "Locked passage",
            condition: "Requires Iron Key",
          },
        },
      ],
    };
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            areas: [],
            passages: [
              {
                id: "edge-1",
                description:
                  "A brass sluice bridge spans the scalding cistern.",
                condition:
                  "Turn both Ember Compact ration valves together, or cross the exposed pipework.",
              },
            ],
          }),
      },
    });
    const service = new DelveAreaEnhancementService(
      {
        entities: {
          "location-1": {
            id: "location-1",
            type: "location",
            title: "The Brass Bastion",
            content: "The Ember Compact controls paired ration valves.",
          },
        },
        loadEntityContent: vi.fn().mockResolvedValue(undefined),
      } as never,
      {
        getModel: vi.fn().mockResolvedValue({ generateContent }),
      },
      { effectiveApiKey: null, modelName: "test-model" },
      undefined,
      { now: () => 1234 },
    );

    const result = await service.populateAllAreas(passageCanvas as Canvas);
    const passage = result.edges[0].data as any;

    expect(result).toMatchObject({ completed: 0, total: 0, failed: 0 });
    expect(passage.description).toContain("brass sluice bridge");
    expect(passage.condition).not.toContain("Iron Key");
    expect(passage.aiEnhancedAt).toEqual(1234);
    expect(
      generateContent.mock.calls[0][0].contents[0].parts[0].text,
    ).toContain("PASSAGES TO ENHANCE");
  });

  it("preserves a conditional passage when AI omits its access condition", async () => {
    const passageCanvas = {
      ...canvas,
      nodes: [
        {
          id: room.id,
          type: "delveRoom" as const,
          position: { x: 0, y: 0 },
          data: { ...room, aiEnhancedAt: 1234 },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: room.id,
          target: room.id,
          type: "delveEdge" as const,
          data: {
            id: "edge-1",
            sourceRoomId: room.id,
            targetRoomId: room.id,
            type: "conditional" as const,
            bidirectional: true,
            description: "Original route",
            condition: "Original condition",
          },
        },
      ],
    };
    const service = new DelveAreaEnhancementService(
      {
        entities: {
          "location-1": {
            id: "location-1",
            type: "location",
            title: "The Brass Bastion",
          },
        },
        loadEntityContent: vi.fn().mockResolvedValue(undefined),
      } as never,
      {
        getModel: vi.fn().mockResolvedValue({
          generateContent: vi.fn().mockResolvedValue({
            response: {
              text: () =>
                JSON.stringify({
                  areas: [],
                  passages: [
                    { id: "edge-1", description: "A rewritten route" },
                  ],
                }),
            },
          }),
        }),
      },
      { effectiveApiKey: null, modelName: "test-model" },
    );

    const result = await service.populateAllAreas(passageCanvas as Canvas);

    expect(result).toMatchObject({ failed: 0, failedPassages: 1 });
    expect(result.edges[0].data).toMatchObject({
      description: "Original route",
      condition: "Original condition",
    });
  });

  it("skips Areas already populated by AI when resuming", async () => {
    const populatedRoom = { ...room, aiEnhancedAt: 1234 };
    const service = new DelveAreaEnhancementService(
      {
        entities: {
          "location-1": {
            id: "location-1",
            type: "location",
            title: "The Brass Bastion",
          },
        },
        loadEntityContent: vi.fn().mockResolvedValue(undefined),
      } as never,
      { getModel: vi.fn() },
      { effectiveApiKey: null, modelName: "test-model" },
    );

    const result = await service.populateAllAreas({
      ...canvas,
      nodes: [
        {
          id: populatedRoom.id,
          type: "delveRoom",
          position: { x: 0, y: 0 },
          data: populatedRoom,
        },
      ],
    });

    expect(result).toMatchObject({ completed: 0, total: 0, failed: 0 });
  });

  it("renames an enhanced Area that still has a generated placeholder", async () => {
    const placeholderRoom = {
      ...room,
      name: "Deep Vault - Area 1",
      aiEnhancedAt: 1234,
    };
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            areas: [
              {
                id: placeholderRoom.id,
                name: "The Drowned Tithe",
                description: "Black water laps against votive pillars.",
                stocking: {
                  encounters: ["An Ember Compact tally-master"],
                  atmosphere: "Cold brass and black water",
                },
              },
            ],
          }),
      },
    });
    const service = new DelveAreaEnhancementService(
      {
        entities: {
          "location-1": {
            id: "location-1",
            type: "location",
            title: "The Brass Bastion",
          },
        },
        loadEntityContent: vi.fn().mockResolvedValue(undefined),
      } as never,
      { getModel: vi.fn().mockResolvedValue({ generateContent }) },
      { effectiveApiKey: null, modelName: "test-model" },
      undefined,
      { now: () => 1234 },
    );

    const result = await service.populateAllAreas({
      ...canvas,
      nodes: [
        {
          id: placeholderRoom.id,
          type: "delveRoom",
          position: { x: 0, y: 0 },
          data: placeholderRoom,
        },
      ],
    });

    expect(generateContent).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ completed: 1, total: 1, failed: 0 });
    expect(result.nodes[0].data).toMatchObject({
      name: "The Drowned Tithe",
      description: "A mechanical chamber.",
      stocking: {
        encounters: ["An Ember Compact guard detail"],
      },
      aiEnhancedAt: 1234,
    });
  });
});
