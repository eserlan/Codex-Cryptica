import { describe, expect, it } from "vitest";
import { assembleHeist, formatQuickReference } from "./heist-staged-assembly";
import { parseHeistResponse } from "./public-heist";
import { validateHeist } from "./heist-validation";
import {
  RESOLVED_THEFT,
  VALID_STAGE_1,
  VALID_STAGE_2,
  VALID_STAGE_3,
} from "./heist-staged.fixtures";

describe("assembleHeist", () => {
  it("assembles stages into a document that parseHeistResponse and validateHeist accept", () => {
    const assembled = assembleHeist(
      VALID_STAGE_1,
      VALID_STAGE_2,
      VALID_STAGE_3,
      RESOLVED_THEFT,
    );

    const parsed = parseHeistResponse(
      JSON.stringify(assembled),
      RESOLVED_THEFT,
    );
    expect(parsed.title).toBe(VALID_STAGE_1.title);
    expect(parsed.content).toContain("### The Score");
    expect(parsed.content).toContain(`### ${RESOLVED_THEFT.objectiveHeading}`);
    expect(parsed.content).toContain("### Casing the Target");
    expect(parsed.lore).toContain("### GM Quick Reference");
    expect(parsed.lore).toContain("### Security Rings");
    expect(parsed.lore).toContain("### Alarm Track");
    expect(parsed.lore).toContain("### Complications");
    expect(parsed.lore).toContain(`### ${RESOLVED_THEFT.momentHeading}`);
    expect(parsed.lore).toContain("### The Getaway");
    expect(parsed.lore).toContain("### Flashback Opportunities");

    const findings = validateHeist({
      heistType: RESOLVED_THEFT.heistType,
      genre: RESOLVED_THEFT.genre,
      content: parsed.content,
      lore: parsed.lore,
    });
    const structural = findings.filter((f) => f.severity === "structural");
    expect(structural).toEqual([]);
  });
});

describe("assembly fallbacks", () => {
  it("uses resolved titles and a useful quick reference when sections are absent", () => {
    const assembled = assembleHeist({}, {}, {}, RESOLVED_THEFT);
    expect(assembled.title).toBe(RESOLVED_THEFT.title);
    expect(assembled.summary).toBe(RESOLVED_THEFT.title);
    expect(assembled.lore).toContain(
      "Reinforcements seal off primary escape routes.",
    );
    expect(assembled.lore).toContain(
      "Intel discrepancy inside the secured perimeter.",
    );
    expect(assembled.labels).toContain("heist-generator");
  });

  it("extracts default complications from object and string arrays", () => {
    for (const complications of [
      [{ label: "Bells (default)", detail: "Early prayer." }],
      ["- **Bells (default)**: Early prayer."],
      "- **Bells (default)**: Early prayer.",
    ]) {
      const result = formatQuickReference(
        { complications },
        {},
        {},
        RESOLVED_THEFT,
      );
      expect(result).toContain("- **Default complication**: Early prayer.");
      expect(result).not.toContain("(default)");
    }
    expect(
      formatQuickReference(
        { quickReference: "  Authored (default)  " },
        {},
        {},
        RESOLVED_THEFT,
      ),
    ).toBe("Authored");
  });
});
