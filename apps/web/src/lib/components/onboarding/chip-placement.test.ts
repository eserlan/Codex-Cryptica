import { describe, expect, it } from "vitest";
import { clearOfControls, type Box } from "./chip-placement";

// A phone layout like the graph's: chip above the Cif button, two floating
// buttons in the band just above the bottom navigation.
const chip: Box = { x: 92, y: 705, width: 275, height: 54 };
const createFab: Box = { x: 295, y: 679, width: 56, height: 56 };
const controlsFab: Box = { x: 166, y: 693, width: 44, height: 44 };

describe("clearOfControls (spec 176, Story 3 scenario 5)", () => {
  it("leaves the chip where it is when nothing is underneath", () => {
    expect(clearOfControls(chip, [])).toBe(705);
    const elsewhere: Box = { x: 10, y: 100, width: 40, height: 40 };
    expect(clearOfControls(chip, [elsewhere])).toBe(705);
  });

  it("moves the chip just above floating buttons it would cover", () => {
    const y = clearOfControls(chip, [createFab, controlsFab], { gap: 8 });
    // Above the higher of the two buttons (679), with an 8px gap.
    expect(y).toBe(679 - 8 - 54);
  });

  it("keeps moving up past a control that the first move lands on", () => {
    const higher: Box = { x: 100, y: 590, width: 200, height: 40 };
    const y = clearOfControls(chip, [createFab, higher], { gap: 8 });
    expect(y).toBe(590 - 8 - 54);
  });

  it("ignores controls beside the chip that do not overlap it", () => {
    const beside: Box = { x: 10, y: 705, width: 60, height: 54 };
    expect(clearOfControls(chip, [beside])).toBe(705);
  });

  it("gives up when there is no clear spot below the top limit (negative case)", () => {
    const wall: Box = { x: 0, y: 40, width: 400, height: 760 };
    expect(clearOfControls(chip, [wall], { minTop: 0 })).toBeNull();
  });
});
