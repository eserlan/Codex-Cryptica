import { describe, expect, it } from "vitest";
import { parseArtDirectionOverride } from "./art-direction-override";

describe("parseArtDirectionOverride", () => {
  it("treats a block with no recognised key as a whole-layer replacement", () => {
    // Every block written before this existed is prose, and must keep meaning
    // exactly what it meant.
    const parsed = parseArtDirectionOverride(
      "ink wash portrait with a silver mask, cold grey wash",
    );

    expect(parsed.layered).toBe(false);
    expect(parsed.fields).toEqual({});
    expect(parsed.remainder).toBe(
      "ink wash portrait with a silver mask, cold grey wash",
    );
  });

  it("reads the theme fields a block names", () => {
    const parsed = parseArtDirectionOverride(
      [
        "Materials: black-lacquered plate, oxblood wool, verdigris bronze",
        "Palette: black, oxblood and bone-ash",
        "Lighting: low guttering torchlight from below",
      ].join("\n"),
    );

    expect(parsed.layered).toBe(true);
    expect(parsed.fields).toEqual({
      materials: "black-lacquered plate, oxblood wool, verdigris bronze",
      palette: "black, oxblood and bone-ash",
      lighting: "low guttering torchlight from below",
    });
    // Unnamed fields are absent rather than empty: the theme supplies them.
    expect(parsed.fields.medium).toBeUndefined();
  });

  it("accepts the obvious synonyms", () => {
    const parsed = parseArtDirectionOverride(
      [
        "Colours: bone and rust",
        "Light: one candle",
        "Tradition: panel icon",
      ].join("\n"),
    );

    expect(parsed.fields.palette).toBe("bone and rust");
    expect(parsed.fields.lighting).toBe("one candle");
    expect(parsed.fields.style).toBe("panel icon");
  });

  it("keeps prose that no theme field owns", () => {
    // "Mood: oppressive" is still direction; dropping it would lose the point
    // of the block.
    const parsed = parseArtDirectionOverride(
      ["Palette: bone and rust", "Mood: oppressive", "Airless and still."].join(
        "\n",
      ),
    );

    expect(parsed.fields.palette).toBe("bone and rust");
    expect(parsed.remainder).toBe("Mood: oppressive Airless and still.");
  });

  it("lets the first mention of a field win", () => {
    const parsed = parseArtDirectionOverride(
      ["Palette: bone and rust", "Palette: hot pink"].join("\n"),
    );

    expect(parsed.fields.palette).toBe("bone and rust");
  });

  it("returns nothing for an empty block", () => {
    expect(parseArtDirectionOverride().layered).toBe(false);
    expect(parseArtDirectionOverride("   ").remainder).toBe("");
  });
});
