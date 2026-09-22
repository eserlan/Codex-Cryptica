import { describe, expect, it } from "vitest";
import { DEVELOPMENT_SECTION_TITLES, developmentToText } from "./format";
import type { Development } from "./types";

const dev: Development = {
  mode: "develop",
  alreadyInteresting: "Everything is made from dragon parts.",
  centralQuestion: "Where do the parts come from?",
  makeItMove: "The last shipment is late.",
  peopleWhoCare: [
    {
      name: "Mara",
      role: "Smith",
      wants: "More scales",
      conflictsWith: "The Warden",
    },
    {
      name: "The Warden",
      role: "Guard",
      wants: "Nothing new",
      conflictsWith: "Mara",
    },
  ],
  playerDirections: [
    { title: "Follow the shipment", description: "Trace it." },
    { title: "Search the cellars", description: "Find the source." },
  ],
  consequences: "The town runs out of parts.",
  creatorQuestions: ["Who built it?", "Are dragons extinct?"],
  generatorSuggestions: [],
};

describe("developmentToText", () => {
  it("quotes the original idea first and includes every section in order", () => {
    const text = developmentToText(dev, "A town made of dragon parts.");
    const order = [
      "A town made of dragon parts.",
      DEVELOPMENT_SECTION_TITLES.alreadyInteresting,
      DEVELOPMENT_SECTION_TITLES.centralQuestion,
      DEVELOPMENT_SECTION_TITLES.makeItMove,
      DEVELOPMENT_SECTION_TITLES.peopleWhoCare,
      DEVELOPMENT_SECTION_TITLES.playerDirections,
      DEVELOPMENT_SECTION_TITLES.consequences,
      DEVELOPMENT_SECTION_TITLES.creatorQuestions,
    ].map((needle) => text.indexOf(needle));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("lists people with what they want and who they oppose", () => {
    const text = developmentToText(dev, "x");
    expect(text).toContain("Mara (Smith)");
    expect(text).toContain("More scales");
    expect(text).toContain("The Warden");
  });

  it("includes the what-changed line when present, and not otherwise", () => {
    expect(developmentToText(dev, "x")).not.toMatch(/What changed/);
    expect(
      developmentToText({ ...dev, whatChanged: "Sharper rivals." }, "x"),
    ).toContain("What changed: Sharper rivals.");
  });

  it("never adds a score", () => {
    expect(developmentToText(dev, "x")).not.toMatch(/score|rating|\/10/i);
  });
});
