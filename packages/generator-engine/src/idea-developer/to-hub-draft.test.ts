import { describe, expect, it } from "vitest";
import { toHubDraft } from "./to-hub-draft";
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

describe("toHubDraft", () => {
  const idea =
    "A town where everything is made from dragon parts, but there are no dragons nearby.";

  it("makes a note-type draft that generators reuse as context", () => {
    const draft = toHubDraft(dev, idea);
    expect(draft.type).toBe("note");
    expect(draft.reuseEnabled).toBe(true);
    expect(draft.pinned).toBe(false);
    expect(draft.status).toBe("draft");
    expect(draft.selectedForSave).toBe(true);
  });

  it("leads the summary with the idea, within 180 characters", () => {
    const draft = toHubDraft(dev, idea);
    expect(draft.summary!.startsWith("A town where everything")).toBe(true);
    expect(draft.summary!.length).toBeLessThanOrEqual(180);
  });

  it("truncates a long idea at a word boundary", () => {
    const long = "word ".repeat(100).trim();
    const draft = toHubDraft(dev, long);
    expect(draft.summary!.length).toBeLessThanOrEqual(180);
    expect(draft.summary!.endsWith("…")).toBe(true);
    const body = draft.summary!.slice(0, -1);
    expect(body.split(" ").every((w) => w === "word")).toBe(true);
  });

  it("normalises whitespace in the summary", () => {
    const draft = toHubDraft(dev, "A   town\n\nof   dragons");
    expect(draft.summary).toBe("A town of dragons");
  });

  it("quotes the idea first in the content, then the development", () => {
    const draft = toHubDraft(dev, idea);
    expect(draft.content.indexOf(idea)).toBe(
      draft.content.indexOf("Your idea:") + "Your idea:\n".length,
    );
    expect(draft.content.indexOf("Central question")).toBeGreaterThan(
      draft.content.indexOf(idea),
    );
  });

  it("labels the draft with the tool and the mode", () => {
    expect(toHubDraft(dev, idea).labels).toEqual(["idea-developer", "develop"]);
    expect(toHubDraft({ ...dev, mode: "assess" }, idea).labels).toEqual([
      "idea-developer",
      "assess",
    ]);
  });

  it("gives a short title from the first clause of the idea", () => {
    const draft = toHubDraft(dev, idea);
    expect(draft.title.length).toBeLessThanOrEqual(60);
    expect(draft.title.startsWith("A town where everything")).toBe(true);
    expect(draft.title).not.toMatch(/[.,;:]$/);
  });

  it("falls back to a plain title when the idea is empty of words", () => {
    expect(toHubDraft(dev, "   ").title).toBe("Idea development");
  });
});
