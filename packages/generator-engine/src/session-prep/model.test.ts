import { describe, expect, it } from "vitest";
import {
  createEmptySessionPrep,
  emptySessionPrepSteps,
  findSingleRouteClues,
  hasSessionPrepContent,
  mergeDraftIntoPrep,
  sessionPrepTitle,
  type SessionPrep,
} from "./model";

function sequentialIds() {
  let n = 0;
  return () => `id-${++n}`;
}

function courierPrep(): SessionPrep {
  const prep = createEmptySessionPrep("A courier vanished on the road.");
  prep.start = "A riderless horse walks through the gate.";
  prep.people = [
    {
      id: "p1",
      name: "Reeve Callan",
      wants: "The ledger burned",
      doesNext: "Sends men to the mill",
      source: "gm",
    },
  ];
  prep.information = [
    {
      id: "c1",
      fact: "The courier is alive at the mill",
      routes: ["Tebb saw the cart", "Mud at the ambush site"],
      critical: true,
      source: "gm",
    },
    {
      id: "c2",
      fact: "Callan ordered the ambush",
      routes: ["The signet", "  "],
      critical: true,
      source: "gm",
    },
    {
      id: "c3",
      fact: "The miller keeps bees",
      routes: [],
      critical: false,
      source: "gm",
    },
  ];
  return prep;
}

describe("createEmptySessionPrep", () => {
  it("starts versioned and empty so later phases can migrate it", () => {
    const prep = createEmptySessionPrep("  A hook  ");
    expect(prep.version).toBe(1);
    expect(prep.seed).toBe("A hook");
    expect(hasSessionPrepContent(prep)).toBe(true);
    expect(emptySessionPrepSteps(prep)).toHaveLength(8);
  });

  it("treats a prep with no seed and no steps as having no content", () => {
    expect(hasSessionPrepContent(createEmptySessionPrep())).toBe(false);
  });
});

describe("emptySessionPrepSteps", () => {
  it("lists only steps the GM has not filled", () => {
    const empty = emptySessionPrepSteps(courierPrep());
    expect(empty).not.toContain("start");
    expect(empty).not.toContain("people");
    expect(empty).not.toContain("information");
    expect(empty).toContain("pressure");
    expect(empty).toContain("consequences");
  });

  it("treats whitespace-only text and blank list items as empty", () => {
    const prep = createEmptySessionPrep();
    prep.pressure = "   ";
    prep.complications = [{ id: "x", text: " ", source: "gm" }];
    expect(emptySessionPrepSteps(prep)).toContain("pressure");
    expect(emptySessionPrepSteps(prep)).toContain("complications");
  });
});

describe("findSingleRouteClues", () => {
  it("flags critical facts with fewer than two non-blank routes", () => {
    expect(findSingleRouteClues(courierPrep()).map((clue) => clue.id)).toEqual([
      "c2",
    ]);
  });

  it("does not flag optional facts, however few routes they have", () => {
    const prep = courierPrep();
    prep.information = prep.information.filter((clue) => clue.id === "c3");
    expect(findSingleRouteClues(prep)).toEqual([]);
  });
});

describe("mergeDraftIntoPrep", () => {
  it("fills only empty steps and never overwrites GM material", () => {
    const prep = courierPrep();
    const merged = mergeDraftIntoPrep(
      prep,
      {
        start: "AI opening that must be ignored",
        pressure: "The judge arrives in two days",
        people: [{ name: "AI person", wants: "x", doesNext: "y" }],
        complications: [{ text: "A bribe offer" }],
        consequences: {
          success: "Callan is exposed",
          failure: "",
          delay: "The ledger is ash",
          avoidance: "",
        },
      },
      sequentialIds(),
    );

    expect(merged.start).toBe(prep.start);
    expect(merged.people).toEqual(prep.people);
    expect(merged.pressure).toBe("The judge arrives in two days");
    expect(merged.complications).toEqual([
      { id: "id-1", text: "A bribe offer", source: "ai" },
    ]);
    expect(merged.consequences.delay).toBe("The ledger is ash");
  });

  it("keeps GM-written consequences and fills only the blank ones", () => {
    const prep = courierPrep();
    prep.consequences.success = "GM success";
    const merged = mergeDraftIntoPrep(
      prep,
      {
        consequences: {
          success: "AI success",
          failure: "AI failure",
          delay: "",
          avoidance: "",
        },
      },
      sequentialIds(),
    );
    expect(merged.consequences.success).toBe("GM success");
    expect(merged.consequences.failure).toBe("AI failure");
  });

  it("does not mutate the prep it was given", () => {
    const prep = createEmptySessionPrep("hook");
    mergeDraftIntoPrep(prep, { pressure: "Something moves" }, sequentialIds());
    expect(prep.pressure).toBe("");
  });
});

describe("sessionPrepTitle", () => {
  it("derives a short title from the seed", () => {
    expect(
      sessionPrepTitle(createEmptySessionPrep("A courier vanished.")),
    ).toBe("Session prep: A courier vanished");
    const long = sessionPrepTitle(createEmptySessionPrep("word ".repeat(40)));
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long.endsWith("…")).toBe(true);
  });

  it("falls back to the opening, then a generic title", () => {
    const prep = createEmptySessionPrep();
    expect(sessionPrepTitle(prep)).toBe("Session prep");
    prep.start = "Rain on the harbour";
    expect(sessionPrepTitle(prep)).toBe("Session prep: Rain on the harbour");
  });
});
