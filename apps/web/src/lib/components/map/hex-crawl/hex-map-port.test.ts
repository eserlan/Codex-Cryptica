import { describe, expect, it, vi } from "vitest";
import { pinAtHex, type HexMapStoreLike } from "./hex-map-port";

const CONFIG = {
  orientation: "pointy",
  size: 40,
  offsetX: 0,
  offsetY: 0,
} as const;

function store(
  activeMapId: string | null,
): HexMapStoreLike & { addPin: ReturnType<typeof vi.fn> } {
  return { activeMapId, addPin: vi.fn(async () => undefined) };
}

describe("pinAtHex", () => {
  it("pins at the hex centre on the map that is on screen", async () => {
    const s = store("m1");
    await pinAtHex(s, CONFIG as never, "m1", "npc-1", { q: 1, r: 0 });

    expect(s.addPin).toHaveBeenCalledTimes(1);
    expect(s.addPin.mock.calls[0][0]).toBe("npc-1");
    expect(s.addPin.mock.calls[0][1]).toEqual(
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    );
  });

  it("refuses a map that is not on screen and pins nothing", async () => {
    const s = store("m2");
    await expect(
      pinAtHex(s, CONFIG as never, "m1", "npc-1", { q: 0, r: 0 }),
    ).rejects.toThrow(/Open this map/);
    expect(s.addPin).not.toHaveBeenCalled();
  });

  it("refuses when there is no hex grid to measure with", async () => {
    const s = store("m1");
    await expect(
      pinAtHex(s, null, "m1", "npc-1", { q: 0, r: 0 }),
    ).rejects.toThrow(/Open this map/);
    expect(s.addPin).not.toHaveBeenCalled();
  });
});
