/** @vitest-environment jsdom */

import type { Canvas } from "@codex/canvas-engine";
import { describe, expect, it, vi } from "vitest";
import { useCanvasAreaEnhancement } from "./canvas-area-enhancement.svelte";

function room(id: string, sectorId = "sector-1", name = id) {
  return {
    id,
    name,
    sectorId,
    sectorName: "The Sector",
    role: "area",
    description: `${name} description`,
    summary: `${name} summary`,
  } as any;
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  const logic = {
    nodes: [
      { id: "room-1", type: "delveRoom", data: room("room-1") },
      { id: "room-2", type: "delveRoom", data: room("room-2") },
      { id: "room-3", type: "delveRoom", data: room("room-3", "sector-2") },
    ],
    edges: [{ id: "edge-1", source: "room-1", target: "room-3", data: {} }],
  } as any;
  const canvas = {
    id: "canvas-1",
    nodes: logic.nodes,
    edges: logic.edges,
    metadata: {},
  } as unknown as Canvas;
  return {
    service: {
      enhanceArea: vi.fn(async ({ room: source }: { room: any }) => ({
        ...source,
        name: "Enhanced room",
      })),
      populateAllAreas: vi.fn(async () => ({
        nodes: canvas.nodes,
        edges: canvas.edges,
        completed: 1,
        total: 1,
        failed: 0,
        failedPassages: 0,
      })),
    },
    vault: {
      canvases: { [canvas.id!]: canvas },
      saveCanvas: vi.fn(async () => undefined),
    },
    canvasRegistry: { canvases: { [canvas.id!]: canvas } },
    logic,
    updateRoomData: vi.fn(),
    canvas,
    ...overrides,
  };
}

describe("useCanvasAreaEnhancement", () => {
  it("finds connected and same-sector areas while excluding the selected area", () => {
    const deps = makeDeps();
    const enhancement = useCanvasAreaEnhancement(deps);

    expect(enhancement.getNearbyAreas(room("room-1"))).toEqual([
      expect.objectContaining({ id: "room-2" }),
      expect.objectContaining({ id: "room-3" }),
    ]);
  });

  it("updates a room after successful enhancement", async () => {
    const deps = makeDeps();
    const enhancement = useCanvasAreaEnhancement(deps);

    await enhancement.enhanceRoom(room("room-1"), deps.canvas);

    expect(deps.service.enhanceArea).toHaveBeenCalledWith(
      expect.objectContaining({
        canvas: deps.canvas,
        room: expect.objectContaining({ id: "room-1" }),
        nearbyAreas: expect.any(Array),
      }),
    );
    expect(deps.updateRoomData).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Enhanced room" }),
    );
    expect(enhancement.isRestockingRoom).toBe(false);
    expect(enhancement.roomEnhancementError).toBeNull();
  });

  it("reports enhancement failures and clears the busy state", async () => {
    const deps = makeDeps({
      service: {
        enhanceArea: vi.fn(async () => {
          throw new Error("Oracle unavailable");
        }),
        populateAllAreas: vi.fn(),
      },
    });
    const enhancement = useCanvasAreaEnhancement(deps);

    await enhancement.enhanceRoom(room("room-1"), deps.canvas);

    expect(deps.updateRoomData).not.toHaveBeenCalled();
    expect(enhancement.isRestockingRoom).toBe(false);
    expect(enhancement.roomEnhancementError).toBe("Oracle unavailable");
  });

  it("persists the result of bulk population and tracks completion", async () => {
    const deps = makeDeps();
    const enhancement = useCanvasAreaEnhancement(deps);

    await enhancement.populateCanvasAreas(deps.canvas);

    expect(deps.vault.saveCanvas).toHaveBeenCalledWith("canvas-1");
    expect(deps.canvas.metadata).toEqual(
      expect.objectContaining({
        areaPopulationStatus: "complete",
        areaPopulationCompleted: 1,
      }),
    );
    expect(enhancement.isAutoPopulating).toBe(false);
    expect(enhancement.autoPopulationMessage).toBeNull();
  });
});
