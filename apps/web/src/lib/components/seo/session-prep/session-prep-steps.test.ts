import { describe, expect, it } from "vitest";
import { createEmptySessionPrep } from "generator-engine";
import { previewSessionPrepStep } from "./session-prep-steps";

describe("previewSessionPrepStep", () => {
  it("says Empty for an unanswered step", () => {
    const prep = createEmptySessionPrep("hook");
    prep.people = [
      { id: "a", name: " ", wants: "x", doesNext: "", source: "gm" },
    ];
    expect(previewSessionPrepStep(prep, "start")).toBe("Empty");
    expect(previewSessionPrepStep(prep, "people")).toBe("Empty");
  });

  it("summarises what each step holds", () => {
    const prep = createEmptySessionPrep("hook");
    prep.start = "x".repeat(80);
    prep.people = ["Callan", "Maren", "Dosh", "Tebb"].map((name, i) => ({
      id: `p${i}`,
      name,
      wants: "",
      doesNext: "",
      source: "gm" as const,
    }));
    prep.information = [
      { id: "c", fact: "A fact", routes: [], critical: true, source: "gm" },
    ];
    prep.consequences.success = "They win";

    expect(previewSessionPrepStep(prep, "start")).toHaveLength(60);
    expect(previewSessionPrepStep(prep, "start").endsWith("…")).toBe(true);
    expect(previewSessionPrepStep(prep, "people")).toBe("Callan, Maren +2");
    expect(previewSessionPrepStep(prep, "information")).toBe("A fact");
    expect(previewSessionPrepStep(prep, "consequences")).toBe(
      "1 of 4 outcomes",
    );
  });
});
