import { describe, expect, it } from "vitest";
import { mintUniqueId, normaliseTitle, resolveTitle, slugify } from "./titles";

describe("normaliseTitle", () => {
  it("folds case and surrounding whitespace so collision detection and connection resolution cannot disagree", () => {
    // research R5: if these two comparisons diverged, importing "goblin" beside
    // "Goblin" would create a pair that resolution can never tell apart —
    // manufacturing exactly the ambiguity FR-018 exists to avoid.
    expect(normaliseTitle("  Goblin ")).toBe(normaliseTitle("goblin"));
  });
});

describe("resolveTitle", () => {
  it("leaves the title untouched when nothing collides (US1-6)", () => {
    expect(resolveTitle("Goblin", ["Orc", "Kobold"])).toEqual({
      finalTitle: "Goblin",
      renamed: false,
    });
  });

  it("suffixes an exact collision (FR-013a)", () => {
    expect(resolveTitle("Goblin", ["Goblin"])).toEqual({
      finalTitle: "Goblin (2)",
      renamed: true,
    });
  });

  it("suffixes a collision differing only in case", () => {
    expect(resolveTitle("Goblin", ["goblin"])).toEqual({
      finalTitle: "Goblin (2)",
      renamed: true,
    });
  });

  it("suffixes a collision differing only in surrounding whitespace", () => {
    expect(resolveTitle("Goblin", ["  Goblin  "])).toEqual({
      finalTitle: "Goblin (2)",
      renamed: true,
    });
  });

  it("increments past an existing suffix rather than stopping at (2)", () => {
    expect(
      resolveTitle("Goblin", ["Goblin", "Goblin (2)", "Goblin (3)"]),
    ).toEqual({
      finalTitle: "Goblin (4)",
      renamed: true,
    });
  });

  it("does not treat a different title sharing a prefix as a collision", () => {
    expect(resolveTitle("Goblin", ["Goblin King"])).toEqual({
      finalTitle: "Goblin",
      renamed: false,
    });
  });
});

describe("slugify", () => {
  it("derives a vault-style id from a title", () => {
    expect(slugify("The Goblin King!")).toBe("the-goblin-king");
  });

  it("falls back rather than producing an empty id", () => {
    expect(slugify("!!!")).toBe("entity");
  });
});

describe("mintUniqueId", () => {
  it("uses the plain slug when free", () => {
    expect(mintUniqueId("Goblin", new Set())).toBe("goblin");
  });

  it("suffixes until free, so import can never land on an existing id (FR-013)", () => {
    expect(mintUniqueId("Goblin", new Set(["goblin", "goblin-2"]))).toBe(
      "goblin-3",
    );
  });
});
