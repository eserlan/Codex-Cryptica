import { describe, expect, it, vi } from "vitest";
import { isLayoutCollinear } from "graph-engine";
import { hasDegenerateSavedCoordinates } from "./saved-coordinate-health";

vi.mock("graph-engine", () => ({
  isLayoutCollinear: vi.fn(),
}));

describe("hasDegenerateSavedCoordinates", () => {
  it("checks finite saved coordinates from the full entity list", () => {
    vi.mocked(isLayoutCollinear).mockReturnValue(true);

    expect(
      hasDegenerateSavedCoordinates([
        { metadata: { coordinates: { x: 0, y: 0 } } },
        { metadata: { coordinates: { x: 4, y: 9 } } },
        { metadata: { coordinates: { x: Number.NaN, y: 2 } } },
        { metadata: {} },
      ]),
    ).toBe(true);
    expect(isLayoutCollinear).toHaveBeenCalledWith([
      { x: 0, y: 0 },
      { x: 4, y: 9 },
    ]);
  });

  it("returns the layout check result for an empty coordinate set", () => {
    vi.mocked(isLayoutCollinear).mockReturnValue(false);

    expect(hasDegenerateSavedCoordinates([{ metadata: null }])).toBe(false);
    expect(isLayoutCollinear).toHaveBeenCalledWith([]);
  });
});
