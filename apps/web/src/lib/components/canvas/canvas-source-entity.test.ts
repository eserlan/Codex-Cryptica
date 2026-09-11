import { describe, it, expect, vi } from "vitest";
import { openOrCreateSourceEntity } from "./canvas-source-entity";

describe("canvas-source-entity", () => {
  function createMockVault(overrides = {}) {
    return {
      entities: {},
      allEntities: [],
      createEntity: vi.fn().mockResolvedValue("new-note-id"),
      ...overrides,
    };
  }

  function createMockCanvasRegistry() {
    return {
      saveCanvas: vi.fn().mockResolvedValue(undefined),
    };
  }

  function createMockModalUIStore() {
    return {
      openZenMode: vi.fn(),
    };
  }

  it("opens existing entity when sourceEntityId is in vault", async () => {
    const vault = createMockVault({
      entities: { "existing-1": { id: "existing-1", title: "Existing" } },
    });
    const canvasRegistry = createMockCanvasRegistry();
    const modalUIStore = createMockModalUIStore();

    await openOrCreateSourceEntity({
      sourceEntityId: "existing-1",
      canvas: { id: "canvas-1", name: "Test Canvas" } as any,
      vault,
      canvasRegistry,
      modalUIStore,
      nodes: [],
    });

    expect(modalUIStore.openZenMode).toHaveBeenCalledWith("existing-1");
    expect(vault.createEntity).not.toHaveBeenCalled();
    expect(canvasRegistry.saveCanvas).not.toHaveBeenCalled();
  });

  it("opens existing note matched by title when sourceEntityId is missing", async () => {
    const vault = createMockVault({
      allEntities: [
        { id: "note-123", title: "Test Adventure", type: "note" },
        { id: "event-456", title: "Test Adventure", type: "event" },
      ],
    });
    const canvasRegistry = createMockCanvasRegistry();
    const modalUIStore = createMockModalUIStore();
    const canvas = {
      id: "canvas-1",
      name: "Test Adventure",
      metadata: {},
    } as any;

    await openOrCreateSourceEntity({
      sourceEntityId: undefined,
      canvas,
      vault,
      canvasRegistry,
      modalUIStore,
      nodes: [],
    });

    expect(modalUIStore.openZenMode).toHaveBeenCalledWith("note-123");
    expect(vault.createEntity).not.toHaveBeenCalled();
    expect(canvas.metadata.sourceEntityId).toBe("note-123");
    expect(canvasRegistry.saveCanvas).toHaveBeenCalledWith("canvas-1");
  });

  it("creates a note using sourceLore when sourceLore is present", async () => {
    const vault = createMockVault();
    const canvasRegistry = createMockCanvasRegistry();
    const modalUIStore = createMockModalUIStore();
    const canvas = {
      id: "canvas-1",
      name: "Lore Adventure",
      metadata: {
        sourceLore: "Direct raw lore content",
        summary: "Adventure summary",
      },
    } as any;

    await openOrCreateSourceEntity({
      sourceEntityId: undefined,
      canvas,
      vault,
      canvasRegistry,
      modalUIStore,
      nodes: [],
    });

    expect(vault.createEntity).toHaveBeenCalledWith("note", "Lore Adventure", {
      content: "*Adventure summary*",
      lore: "Direct raw lore content",
      kind: "adventure",
      labels: ["adventure"],
    });
    expect(canvas.metadata.sourceEntityId).toBe("new-note-id");
    expect(canvasRegistry.saveCanvas).toHaveBeenCalledWith("canvas-1");
    expect(modalUIStore.openZenMode).toHaveBeenCalledWith("new-note-id");
  });

  it("synthesizes markdown lore from nodes when sourceLore is absent", async () => {
    const vault = createMockVault();
    const canvasRegistry = createMockCanvasRegistry();
    const modalUIStore = createMockModalUIStore();
    const canvas = {
      id: "canvas-1",
      name: "Structured Adventure",
      metadata: {},
    } as any;

    const nodes = [
      {
        type: "situation",
        data: {
          summary: "The kingdom is falling",
          hook: "A mysterious message arrives",
          goal: "Save the king",
        },
      },
      {
        type: "location",
        label: "Dark Tower",
        data: {
          description: "Spooky tower",
          role: "Boss lair",
          hazard: "Falling rocks",
        },
      },
      {
        type: "npc",
        label: "Archmage Eldrin",
        data: { role: "Ally", relation: "Friend", wants: "Ancient artifact" },
      },
      {
        type: "clue",
        label: "Torn Page",
        data: { description: "Mentions secret door", leadsTo: "Basement" },
      },
      {
        type: "threat",
        label: "Shadow Beast",
        data: { description: "Lurks in shadows", trigger: "Noise" },
      },
      {
        type: "outcome",
        label: "Victory",
        data: { description: "Kingdom is saved" },
      },
    ] as any[];

    await openOrCreateSourceEntity({
      sourceEntityId: undefined,
      canvas,
      vault,
      canvasRegistry,
      modalUIStore,
      nodes,
    });

    expect(vault.createEntity).toHaveBeenCalledWith(
      "note",
      "Structured Adventure",
      expect.objectContaining({
        content: "*The kingdom is falling*",
        kind: "adventure",
        labels: ["adventure"],
      }),
    );

    const loreCallArg = vault.createEntity.mock.calls[0][2].lore;
    expect(loreCallArg).toContain("# Structured Adventure");
    expect(loreCallArg).toContain("## Situation & Hook");
    expect(loreCallArg).toContain(
      "**Starting Hook:** A mysterious message arrives",
    );
    expect(loreCallArg).toContain("## Key Locations");
    expect(loreCallArg).toContain("### Dark Tower");
    expect(loreCallArg).toContain("## Important NPCs & Factions");
    expect(loreCallArg).toContain("### Archmage Eldrin (Ally)");
    expect(loreCallArg).toContain("## Clues & Threats");
    expect(loreCallArg).toContain(
      "- **Torn Page:** Mentions secret door *(Leads to: Basement)*",
    );
    expect(loreCallArg).toContain(
      "- **Shadow Beast:** Lurks in shadows *(Trigger: Noise)*",
    );
    expect(loreCallArg).toContain("## Possible Outcomes");
    expect(loreCallArg).toContain("### Victory");

    expect(modalUIStore.openZenMode).toHaveBeenCalledWith("new-note-id");
  });
});
