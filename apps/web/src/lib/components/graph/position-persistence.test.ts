import { describe, expect, it } from "vitest";
import {
  selectLayoutPositionUpdates,
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

describe("selectLayoutPositionUpdates", () => {
  const updates = { saved: at(20, 20), fresh: at(10, 10) };
  const getEntity = (id: string) => (id === "saved" ? at(1, 1) : {});
  const policy = {
    status: "idle",
    loadPhase: "ready",
    isInitial: false,
    focusViewActive: false,
    savedCoordsDegenerate: false,
  };

  it("persists full-graph updates after load, including healing an initial layout", () => {
    expect(selectLayoutPositionUpdates(updates, getEntity, policy)).toEqual({
      updates,
      healsSavedCoordinates: true,
    });
    expect(
      selectLayoutPositionUpdates(updates, getEntity, {
        ...policy,
        isInitial: true,
        savedCoordsDegenerate: true,
      }),
    ).toEqual({ updates, healsSavedCoordinates: true });
  });

  it("only fills missing positions during initial and focus-view layouts", () => {
    for (const change of [
      { isInitial: true },
      { focusViewActive: true, healed: true },
    ]) {
      expect(
        selectLayoutPositionUpdates(updates, getEntity, {
          ...policy,
          ...change,
        }),
      ).toEqual({
        updates: { fresh: updates.fresh },
        healsSavedCoordinates: false,
      });
    }
  });

  it("never saves while loading or rewrites already-saved focus positions", () => {
    expect(
      selectLayoutPositionUpdates(updates, getEntity, {
        ...policy,
        status: "loading",
        healed: true,
      }).updates,
    ).toBeNull();
    expect(
      selectLayoutPositionUpdates({ saved: updates.saved }, getEntity, {
        ...policy,
        focusViewActive: true,
      }).updates,
    ).toBeNull();
  });
});
