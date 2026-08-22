import { describe, expect, it } from "vitest";
import { OUTCOME_BANDS } from "schema";
import {
  BAND_ORDER,
  bandLabel,
  bandMagnitude,
  bandForTotal,
  permittedBands,
  isSuccessBand,
  isFailureBand,
} from "./bands";

describe("band ordering", () => {
  it("matches the schema's five ordered bands", () => {
    expect(BAND_ORDER).toEqual(OUTCOME_BANDS);
  });

  it("gives every band a plain-language label (Constitution IX)", () => {
    for (const band of BAND_ORDER) {
      const label = bandLabel(band);
      expect(label.length).toBeGreaterThan(0);
      // No jargon-y shorthand like "crit" leaking into user-facing text.
      expect(label.toLowerCase()).not.toContain("crit");
    }
  });
});

describe("bandMagnitude (FR-017a, FR-017b, FR-032a)", () => {
  it("returns the same magnitude for the same band every time (FR-032a)", () => {
    for (const band of BAND_ORDER) {
      const first = bandMagnitude(band);
      expect(bandMagnitude(band)).toEqual(first);
      expect(bandMagnitude(band)).toEqual(first);
    }
  });

  it("moves relationship strength toward the faction on success bands (FR-017a)", () => {
    expect(bandMagnitude("decisive-success").strength).toBeGreaterThan(0);
    expect(bandMagnitude("success").strength).toBeGreaterThan(0);
  });

  it("moves relationship strength away on failure bands (FR-017a)", () => {
    expect(bandMagnitude("failure").strength).toBeLessThan(0);
    expect(bandMagnitude("backfire").strength).toBeLessThan(0);
  });

  it("gives the mixed band the smallest movement of any band (FR-017a)", () => {
    const mixed = Math.abs(bandMagnitude("mixed").strength);
    for (const band of BAND_ORDER) {
      if (band === "mixed") continue;
      expect(Math.abs(bandMagnitude(band).strength)).toBeGreaterThan(mixed);
    }
  });

  it("is monotonic across the ordered bands (FR-017b)", () => {
    // A decisive success never moves the world less than a success, and a
    // backfire never moves it less than a failure.
    expect(bandMagnitude("decisive-success").strength).toBeGreaterThan(
      bandMagnitude("success").strength,
    );
    expect(bandMagnitude("success").strength).toBeGreaterThan(
      bandMagnitude("mixed").strength,
    );
    expect(bandMagnitude("mixed").strength).toBeGreaterThan(
      bandMagnitude("failure").strength,
    );
    expect(bandMagnitude("failure").strength).toBeGreaterThan(
      bandMagnitude("backfire").strength,
    );
  });

  it("applies the same monotonic ordering to the stat change", () => {
    const stats = BAND_ORDER.map((b) => bandMagnitude(b).stat);
    for (let i = 1; i < stats.length; i++) {
      expect(stats[i - 1]).toBeGreaterThan(stats[i]);
    }
  });
});

describe("isSuccessBand / isFailureBand", () => {
  it("classifies the two success bands", () => {
    expect(isSuccessBand("decisive-success")).toBe(true);
    expect(isSuccessBand("success")).toBe(true);
    expect(isSuccessBand("mixed")).toBe(false);
  });

  it("classifies the two failure bands", () => {
    expect(isFailureBand("failure")).toBe(true);
    expect(isFailureBand("backfire")).toBe(true);
    expect(isFailureBand("mixed")).toBe(false);
  });
});

describe("bandForTotal", () => {
  it("maps a large margin to decisive success", () => {
    expect(bandForTotal(12, 3)).toBe("decisive-success");
  });

  it("maps a large negative margin to backfire", () => {
    expect(bandForTotal(3, 14)).toBe("backfire");
  });

  it("maps a tie to the mixed band", () => {
    expect(bandForTotal(7, 7)).toBe("mixed");
  });

  it("is deterministic for identical inputs (SC-006)", () => {
    expect(bandForTotal(9, 6)).toBe(bandForTotal(9, 6));
  });

  it("never returns a value outside the five bands", () => {
    for (let acting = 0; acting <= 30; acting++) {
      for (let opposing = 0; opposing <= 30; opposing++) {
        expect(BAND_ORDER).toContain(bandForTotal(acting, opposing));
      }
    }
  });
});

describe("permittedBands (FR-021a)", () => {
  it("spans at most one band either side", () => {
    expect(permittedBands("mixed")).toEqual(["success", "mixed", "failure"]);
  });

  it("truncates at the top of the scale", () => {
    expect(permittedBands("decisive-success")).toEqual([
      "decisive-success",
      "success",
    ]);
  });

  it("truncates at the bottom of the scale", () => {
    expect(permittedBands("backfire")).toEqual(["failure", "backfire"]);
  });

  it("always includes the mechanical band itself", () => {
    for (const band of BAND_ORDER) {
      expect(permittedBands(band)).toContain(band);
    }
  });

  it("never returns more than three bands", () => {
    for (const band of BAND_ORDER) {
      expect(permittedBands(band).length).toBeLessThanOrEqual(3);
    }
  });
});
