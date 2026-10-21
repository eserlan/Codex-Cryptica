import { describe, expect, it } from "bun:test";
import { buildComparison, COMPARISON_ROW_IDS } from "../src/compare";

describe("buildComparison", () => {
  it("compares two biomes with rows in a fixed order", () => {
    const result = buildComparison(["tundra", "hot-desert"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.biomes.map((b) => b.id)).toEqual(["tundra", "hot-desert"]);
    expect(result.rows.map((r) => r.id)).toEqual([...COMPARISON_ROW_IDS]);
    expect(COMPARISON_ROW_IDS).toEqual([
      "temperature",
      "seasonality",
      "precipitation",
      "elevation",
      "waterAvailability",
      "landscape",
      "vegetation",
      "wildlife",
      "resources",
      "hazards",
    ]);
    for (const row of result.rows) expect(row.cells).toHaveLength(2);
  });

  it("compares three biomes", () => {
    const result = buildComparison(["tundra", "hot-desert", "savanna"]);
    expect(result.ok && result.rows.every((r) => r.cells.length === 3)).toBe(
      true,
    );
  });

  it("gives ranges as readable text with units", () => {
    const result = buildComparison(["tundra", "hot-desert"]);
    if (!result.ok) throw new Error("expected ok");
    const temperature = result.rows.find((r) => r.id === "temperature")!;
    expect(temperature.cells[0]).toMatchObject({
      kind: "range",
      text: "-20 to 0 °C",
    });
  });

  it("shows statements where the data is text", () => {
    const result = buildComparison(["tundra", "savanna"]);
    if (!result.ok) throw new Error("expected ok");
    const vegetation = result.rows.find((r) => r.id === "vegetation")!;
    expect(vegetation.cells[0].kind).toBe("statements");
  });

  it("marks a value a biome does not have as not applicable instead of leaving it blank", () => {
    const result = buildComparison(["wetland", "tundra"]);
    if (!result.ok) throw new Error("expected ok");
    const temperature = result.rows.find((r) => r.id === "temperature")!;
    expect(temperature.cells[0]).toEqual({ kind: "not-applicable" });
    expect(temperature.cells[1].kind).toBe("range");
    const elevation = result.rows.find((r) => r.id === "elevation")!;
    expect(elevation.cells[1]).toEqual({ kind: "not-applicable" });
  });

  it("needs at least two biomes", () => {
    expect(buildComparison([])).toMatchObject({
      ok: false,
      reason: "needs-two",
    });
    expect(buildComparison(["tundra"])).toMatchObject({
      ok: false,
      reason: "needs-two",
    });
  });

  it("allows at most three biomes", () => {
    expect(
      buildComparison(["tundra", "hot-desert", "savanna", "wetland"]),
    ).toMatchObject({ ok: false, reason: "too-many" });
  });

  it("skips unknown ids and lists them", () => {
    const result = buildComparison(["tundra", "nope", "hot-desert"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.biomes).toHaveLength(2);
      expect(result.missing).toEqual(["nope"]);
    }
    const tooFew = buildComparison(["tundra", "nope"]);
    expect(tooFew).toMatchObject({
      ok: false,
      reason: "needs-two",
      missing: ["nope"],
    });
  });

  it("ignores repeated ids", () => {
    expect(buildComparison(["tundra", "tundra"])).toMatchObject({
      ok: false,
      reason: "needs-two",
    });
  });
});
