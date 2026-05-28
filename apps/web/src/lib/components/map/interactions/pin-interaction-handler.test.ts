import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MapPin } from "schema";
import { PinInteractionHandler } from "./pin-interaction-handler";

function pin(input: Partial<MapPin> & { id: string; x: number; y: number }) {
  return {
    id: input.id,
    entityId: input.entityId,
    coordinates: { x: input.x, y: input.y },
    visuals: {},
  } satisfies MapPin;
}

describe("PinInteractionHandler", () => {
  let pins: MapPin[];
  let canEdit = true;
  let updatePinCoordinates: ReturnType<typeof vi.fn>;
  let saveMaps: ReturnType<typeof vi.fn>;
  let selectEntity: ReturnType<typeof vi.fn>;
  let handler: PinInteractionHandler;

  beforeEach(() => {
    pins = [pin({ id: "pin-a", x: 100, y: 100, entityId: "entity-a" })];
    canEdit = true;
    updatePinCoordinates = vi.fn((pinId: string, point) => {
      const target = pins.find((candidate) => candidate.id === pinId);
      if (target) target.coordinates = point;
    });
    saveMaps = vi.fn().mockResolvedValue(undefined);
    selectEntity = vi.fn();
    handler = new PinInteractionHandler({
      getPins: () => pins,
      project: (point) => point,
      unproject: (point) => point,
      canEditPins: () => canEdit,
      updatePinCoordinates,
      saveMaps,
      selectEntity,
    });
  });

  it("selects a clicked pin and linked entity without saving maps", async () => {
    expect(handler.begin({ x: 100, y: 100 })?.id).toBe("pin-a");

    const result = await handler.end({ x: 100, y: 100 }, { x: 102, y: 102 });

    expect(result).toEqual({ type: "selected", pinId: "pin-a" });
    expect(selectEntity).toHaveBeenCalledWith("entity-a");
    expect(saveMaps).not.toHaveBeenCalled();
  });

  it("selects a pin at a viewport point without starting a drag", () => {
    const selected = handler.selectAt({ x: 100, y: 100 });

    expect(selected?.id).toBe("pin-a");
    expect(selectEntity).toHaveBeenCalledWith("entity-a");
    expect(handler.dragState).toBeNull();
  });

  it("updates coordinates while dragging and saves on mouse up", async () => {
    handler.begin({ x: 100, y: 100 });
    handler.move({ x: 130, y: 135 }, { x: 100, y: 100 });

    expect(updatePinCoordinates).toHaveBeenCalledWith("pin-a", {
      x: 130,
      y: 135,
    });

    const result = await handler.end({ x: 100, y: 100 }, { x: 130, y: 135 });

    expect(result).toEqual({ type: "dragged", pinId: "pin-a" });
    expect(saveMaps).toHaveBeenCalled();
  });

  it("restores original coordinates when movement stays within the click threshold", async () => {
    handler.begin({ x: 100, y: 100 });
    handler.move({ x: 102, y: 102 }, { x: 100, y: 100 });

    await handler.end({ x: 100, y: 100 }, { x: 102, y: 102 });

    expect(updatePinCoordinates).toHaveBeenCalledWith("pin-a", {
      x: 100,
      y: 100,
    });
    expect(saveMaps).not.toHaveBeenCalled();
  });

  it("does not mutate or save pins when editing is disabled", async () => {
    canEdit = false;

    handler.begin({ x: 100, y: 100 });
    handler.move({ x: 130, y: 135 }, { x: 100, y: 100 });
    await handler.end({ x: 100, y: 100 }, { x: 130, y: 135 });

    expect(updatePinCoordinates).not.toHaveBeenCalled();
    expect(saveMaps).not.toHaveBeenCalled();
  });
});
