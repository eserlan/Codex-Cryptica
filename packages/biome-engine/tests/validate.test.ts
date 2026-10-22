import { describe, expect, it } from "bun:test";
import { validateForSave } from "../src/validate";
import { addAlteration, createBlankProfile } from "../src/profile";

describe("validateForSave", () => {
  it("accepts a valid title with no warnings", () => {
    expect(validateForSave("Ashen Taiga", createBlankProfile())).toEqual({
      ok: true,
      warnings: [],
    });
  });

  it("requires a title", () => {
    for (const title of ["", "   ", "\n\t"]) {
      const result = validateForSave(title, createBlankProfile());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors[0].code).toBe("title-required");
    }
  });

  it("accepts a title of exactly 120 characters and rejects 121", () => {
    expect(validateForSave("x".repeat(120), createBlankProfile()).ok).toBe(
      true,
    );
    const result = validateForSave("x".repeat(121), createBlankProfile());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].code).toBe("title-too-long");
  });

  it("trims the title before measuring it", () => {
    expect(
      validateForSave(`  ${"x".repeat(120)}  `, createBlankProfile()).ok,
    ).toBe(true);
  });

  it("rejects own text over 4,000 characters", () => {
    const profile = createBlankProfile();
    profile.own.terrain = "x".repeat(4001);
    const result = validateForSave("Name", profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some(
          (e) => e.code === "text-too-long" && e.field === "terrain",
        ),
      ).toBe(true);
    }
  });
});

describe("validateForSave alterations", () => {
  it("warns, without blocking, about an alteration with no cause", () => {
    const profile = addAlteration(
      createBlankProfile(),
      { aspect: "climate", description: "Ash rain" },
      "a1",
    );
    const result = validateForSave("Name", profile);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toEqual([
        expect.objectContaining({
          code: "alteration-missing-cause",
          alterationId: "a1",
        }),
      ]);
    }
  });

  it("treats a whitespace-only cause as missing and a real cause as fine", () => {
    let profile = addAlteration(
      createBlankProfile(),
      { aspect: "climate", description: "Ash rain", cause: "   " },
      "a1",
    );
    profile = addAlteration(
      profile,
      { aspect: "water", description: "Black rivers", cause: "Ink springs" },
      "a2",
    );
    const result = validateForSave("Name", profile);
    expect(result.ok && result.warnings.map((w) => w.alterationId)).toEqual([
      "a1",
    ]);
  });

  it("reports an alteration with an empty description as an error", () => {
    const profile = createBlankProfile();
    profile.alterations = [
      { id: "a1", aspect: "climate", description: "", cause: "x", effects: [] },
    ];
    const result = validateForSave("Name", profile);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors[0].code).toBe("alteration-description-required");
  });
});
