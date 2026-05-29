import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MeasurementState } from "../../../../types/vtt";
import { MeasurementInteractionHandler } from "./measurement-interaction-handler";

describe("MeasurementInteractionHandler", () => {
  let measurement: MeasurementState;
  let setMeasurementStart: ReturnType<typeof vi.fn>;
  let setMeasurementEnd: ReturnType<typeof vi.fn>;
  let setMeasurementLocked: ReturnType<typeof vi.fn>;
  let handler: MeasurementInteractionHandler;

  beforeEach(() => {
    measurement = { active: false, start: null, end: null, locked: false };
    setMeasurementStart = vi.fn((start) => {
      measurement = { ...measurement, start };
    });
    setMeasurementEnd = vi.fn((end, silent) => {
      void silent;
      measurement = { ...measurement, end };
    });
    setMeasurementLocked = vi.fn((locked) => {
      measurement = { ...measurement, locked };
    });
    handler = new MeasurementInteractionHandler({
      getMeasurement: () => measurement,
      unproject: (point: { x: number; y: number }) => ({
        x: point.x + 1,
        y: point.y + 2,
      }),
      setMeasurementStart,
      setMeasurementEnd,
      setMeasurementLocked,
    } as any);
  });

  it("updates live measurement end silently while active and unlocked", () => {
    measurement = {
      active: true,
      start: { x: 0, y: 0 },
      end: null,
      locked: false,
    };

    expect(handler.updateLiveEnd({ x: 10, y: 20 })).toBe(true);

    expect(setMeasurementEnd).toHaveBeenCalledWith({ x: 11, y: 22 }, true);
  });

  it("does not update live measurement end when locked", () => {
    measurement = {
      active: true,
      start: { x: 0, y: 0 },
      end: null,
      locked: true,
    };

    expect(handler.updateLiveEnd({ x: 10, y: 20 })).toBe(false);

    expect(setMeasurementEnd).not.toHaveBeenCalled();
  });

  it("starts, locks, then restarts measurement on repeated clicks", () => {
    measurement = { active: true, start: null, end: null, locked: false };

    expect(handler.handleClick({ x: 10, y: 20 })).toBe(true);
    expect(setMeasurementStart).toHaveBeenLastCalledWith({ x: 11, y: 22 });

    measurement = {
      active: true,
      start: { x: 11, y: 22 },
      end: null,
      locked: false,
    };
    handler.handleClick({ x: 30, y: 40 });
    expect(setMeasurementEnd).toHaveBeenLastCalledWith({ x: 31, y: 42 });
    expect(setMeasurementLocked).toHaveBeenLastCalledWith(true);

    measurement = {
      active: true,
      start: { x: 11, y: 22 },
      end: { x: 31, y: 42 },
      locked: true,
    };
    handler.handleClick({ x: 50, y: 60 });
    expect(setMeasurementStart).toHaveBeenLastCalledWith({ x: 51, y: 62 });
  });
});
