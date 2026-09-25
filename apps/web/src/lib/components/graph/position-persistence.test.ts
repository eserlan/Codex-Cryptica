import { describe, expect, it } from "vitest";
import {
  hasSavedPosition,
  unsavedPositionUpdates,
} from "./position-persistence";

const at = (x: number, y: number) => ({
  metadata: { coordinates: { x, y } },
});

describe("hasSavedPosition", () => {
  it("accepts finite coordinates, including the origin", () => {
    expect(hasSavedPosition(at(12, -4))).toBe(true);
    expect(hasSavedPosition(at(0, 0))).toBe(true);
  });

  it("rejects missing or non-finite coordinates", () => {
    expect(hasSavedPosition({})).toBe(false);
    expect(hasSavedPosition({ metadata: {} })).toBe(false);
    expect(hasSavedPosition(at(Number.NaN, 1))).toBe(false);
    expect(hasSavedPosition(undefined)).toBe(false);
  });
});

describe("unsavedPositionUpdates", () => {
  it("keeps only entities without a saved position", () => {
    const entities: Record<string, unknown> = {
      placed: at(5, 5),
      unplaced: { metadata: {} },
    };
    const updates = {
      placed: at(100, 100),
      unplaced: at(40, 40),
      gone: at(1, 1),
    };

    const result = unsavedPositionUpdates(updates, (id) => entities[id]);

    // Never overwrite a saved layout, and ignore entities that no longer exist.
    expect(result).toEqual({ unplaced: at(40, 40) });
  });
});
