import { describe, expect, it, vi } from "vitest";
import {
  PENDING_DELVE_CANVAS_KEY,
  PendingDelveTransferService,
  createPendingDelveTransfer,
} from "./pending-delve-transfer";

function createMemoryStorage(initialValue?: unknown) {
  const values = new Map<string, string>();
  if (initialValue !== undefined) {
    values.set(PENDING_DELVE_CANVAS_KEY, JSON.stringify(initialValue));
  }
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
}

const sourceEntity = {
  type: "location" as const,
  kind: "dungeon",
  title: "The Hollowed Citadel of Bruneth",
  content: "A generated dungeon.",
  lore: "### Dungeon Layout\n1. The Sunken Forge",
  labels: ["location", "delve"],
  status: "active" as const,
};

const canvas = {
  id: "delve-canvas-bruneth",
  name: sourceEntity.title,
  nodes: [],
  edges: [],
  metadata: { kind: "delve" },
};

describe("PendingDelveTransferService", () => {
  it("creates the generated Location and links it to the imported canvas", async () => {
    const transfer = createPendingDelveTransfer(canvas, sourceEntity);
    const storage = createMemoryStorage(transfer);
    const entityStore = {
      allEntities: [],
      createEntity: vi.fn().mockResolvedValue("location-bruneth"),
    };
    const canvasImporter = {
      importCanvas: vi.fn().mockResolvedValue("hollowed-citadel"),
    };
    const service = new PendingDelveTransferService(
      entityStore as never,
      canvasImporter,
      storage,
    );

    await expect(service.importPending()).resolves.toBe("hollowed-citadel");
    expect(entityStore.createEntity).toHaveBeenCalledWith(
      "location",
      sourceEntity.title,
      expect.objectContaining({
        content: sourceEntity.content,
        lore: sourceEntity.lore,
        kind: "dungeon",
      }),
    );
    expect(canvasImporter.importCanvas).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          kind: "delve",
          sourceEntityId: "location-bruneth",
        }),
      }),
    );
    expect(storage.getItem(PENDING_DELVE_CANVAS_KEY)).toBeNull();
  });

  it("migrates root-level public delve nodes before importing and linking", async () => {
    const legacyCanvas = {
      ...canvas,
      nodes: [
        {
          id: "room-1",
          type: "delveRoom",
          position: { x: 0, y: 0 },
          sectorId: "sector-1",
          sectorName: "The Sunken Forge",
          name: "Flooded Threshold",
          role: "entrance",
          summary: "A flooded gate.",
          description: "Black water covers the lower steps.",
          stocking: {},
        },
      ],
    };
    const storage = createMemoryStorage(
      createPendingDelveTransfer(legacyCanvas, sourceEntity),
    );
    const entityStore = {
      allEntities: [],
      createEntity: vi.fn().mockResolvedValue("location-bruneth"),
    };
    const canvasImporter = {
      importCanvas: vi.fn().mockResolvedValue("hollowed-citadel"),
    };
    const service = new PendingDelveTransferService(
      entityStore as never,
      canvasImporter,
      storage,
    );

    await service.importPending();

    expect(entityStore.createEntity).toHaveBeenCalledOnce();
    expect(canvasImporter.importCanvas).toHaveBeenCalledWith(
      expect.objectContaining({
        name: sourceEntity.title,
        nodes: [
          expect.objectContaining({
            id: "room-1",
            data: expect.objectContaining({
              sectorId: "sector-1",
              name: "Flooded Threshold",
            }),
          }),
        ],
        metadata: expect.objectContaining({
          sourceEntityId: "location-bruneth",
        }),
      }),
    );
  });

  it("does not create a Location for an invalid transferred canvas", async () => {
    const storage = createMemoryStorage(
      createPendingDelveTransfer(
        { ...canvas, nodes: [{ id: "broken" }] },
        sourceEntity,
      ),
    );
    const entityStore = {
      allEntities: [],
      createEntity: vi.fn().mockResolvedValue("location-bruneth"),
    };
    const service = new PendingDelveTransferService(
      entityStore as never,
      { importCanvas: vi.fn() },
      storage,
    );

    await expect(service.importPending()).rejects.toThrow();
    expect(entityStore.createEntity).not.toHaveBeenCalled();
  });

  it("reuses an existing generated delve Location with the same title", async () => {
    const transfer = createPendingDelveTransfer(canvas, sourceEntity);
    const storage = createMemoryStorage(transfer);
    const entityStore = {
      allEntities: [
        {
          id: "existing-location",
          type: "location",
          kind: "dungeon",
          title: sourceEntity.title,
          labels: ["delve"],
        },
      ],
      createEntity: vi.fn(),
    };
    const canvasImporter = {
      importCanvas: vi.fn().mockResolvedValue("hollowed-citadel"),
    };
    const service = new PendingDelveTransferService(
      entityStore as never,
      canvasImporter,
      storage,
    );

    await service.importPending();

    expect(entityStore.createEntity).not.toHaveBeenCalled();
    expect(canvasImporter.importCanvas).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          sourceEntityId: "existing-location",
        }),
      }),
    );
  });

  it("keeps the linked transfer for retry when canvas import fails", async () => {
    const transfer = createPendingDelveTransfer(canvas, sourceEntity);
    const storage = createMemoryStorage(transfer);
    const entityStore = {
      allEntities: [],
      createEntity: vi.fn().mockResolvedValue("location-bruneth"),
    };
    const canvasImporter = {
      importCanvas: vi.fn().mockRejectedValue(new Error("disk unavailable")),
    };
    const service = new PendingDelveTransferService(
      entityStore as never,
      canvasImporter,
      storage,
    );

    await expect(service.importPending()).rejects.toThrow("disk unavailable");

    const pending = JSON.parse(
      storage.getItem(PENDING_DELVE_CANVAS_KEY) as string,
    );
    expect(pending.sourceEntityId).toBe("location-bruneth");
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
