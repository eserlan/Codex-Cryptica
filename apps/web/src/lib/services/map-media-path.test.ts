import { describe, expect, it } from "vitest";
import { hasSafeMapPaths, isMapMediaPath } from "./map-media-path";

describe("isMapMediaPath", () => {
  it.each(["maps/a.webp", "maps/abc_mask.png", "maps/Atlas.JPG"])(
    "accepts %s",
    (path) => expect(isMapMediaPath(path)).toBe(true),
  );

  it.each([
    ".codex",
    ".codex/maps.json",
    "entities/a.md",
    "maps/../entities/a.md",
    "maps/sub/a.png",
    "maps/a.md",
    "/maps/a.png",
    "images/a.png",
    "",
    5,
  ])("rejects %s", (path) => expect(isMapMediaPath(path)).toBe(false));
});

describe("hasSafeMapPaths", () => {
  it("accepts map media and external URLs", () => {
    expect(
      hasSafeMapPaths({
        assetPath: "https://example.com/a.png",
        fogOfWar: { maskPath: "maps/a_mask.png" },
      }),
    ).toBe(true);
  });

  it("rejects a local path outside the maps folder", () => {
    expect(hasSafeMapPaths({ assetPath: ".codex" })).toBe(false);
    expect(
      hasSafeMapPaths({
        assetPath: "maps/a.png",
        fogOfWar: { maskPath: ".codex/maps.json" },
      }),
    ).toBe(false);
  });
});
