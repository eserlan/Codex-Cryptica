import { describe, expect, it, vi } from "vitest";
import { VTTTokenDefaults } from "./vtt-token-defaults";

function defaults(gridSize = 50, gridType = "square") {
  return new VTTTokenDefaults(
    {
      getMapStore: () => ({ gridSize, gridType }),
      getActiveLayer: () => "object",
    },
    () => 3,
    { uuid: () => "new-token" },
  );
}

describe("token defaults", () => {
  it("creates a visible character with the active layer and next z index", () => {
    expect(
      defaults(15).getTokenDefaults({ name: " Hero ", x: 2, y: 3 }),
    ).toMatchObject({
      id: "new-token",
      name: "Hero",
      width: 30,
      height: 30,
      x: 2,
      y: 3,
      layer: "object",
      zIndex: 3,
      visibleTo: "all",
      baseShape: "circle",
    });
  });

  it("preserves explicit dimensions and appearance overrides", () => {
    expect(
      defaults().getTokenDefaults({
        name: "Marker",
        x: 0,
        y: 0,
        width: 10,
        height: 20,
        layer: "token",
        facingIndicator: false,
        color: "red",
        baseShape: "square",
      }),
    ).toMatchObject({
      width: 10,
      height: 20,
      layer: "token",
      facingIndicator: false,
      color: "red",
      baseShape: "square",
    });
  });

  it.each(["hex-flat", "hex-pointy"])("matches a tile to %s", (gridType) => {
    expect(
      defaults(50, gridType).getTokenDefaults({
        name: "Room",
        x: 0,
        y: 0,
        kind: "tile",
      }).baseShape,
    ).toBe(gridType);
  });

  it("hides notes by default and does not attach note fields to characters", () => {
    expect(
      defaults().getTokenDefaults({ name: "Secret", x: 0, y: 0, kind: "note" }),
    ).toMatchObject({
      visibleTo: "gm-only",
      facingIndicator: false,
      color: "#f5b942",
      noteBody: "",
      width: 25,
    });
    const character = defaults().getTokenDefaults({
      name: "Hero",
      x: 0,
      y: 0,
      noteBody: "discarded",
      noteCollapsedFrom: { width: 90, height: 90 },
    });
    expect(character.noteBody).toBeUndefined();
    expect(character.noteCollapsedFrom).toBeUndefined();
  });

  it("does not consult the active layer when the caller supplies one", () => {
    const getActiveLayer = vi.fn(() => {
      throw new Error("unavailable");
    });
    const subject = new VTTTokenDefaults(
      { getMapStore: () => ({}), getActiveLayer },
      () => 0,
    );
    expect(
      subject.getTokenDefaults({ name: "Hero", x: 0, y: 0, layer: "token" })
        .layer,
    ).toBe("token");
    expect(getActiveLayer).not.toHaveBeenCalled();
  });
});
