import { describe, expect, it } from "vitest";
import {
  buildGeneratorMarkdown,
  buildMysteryPlayerHandout,
  buildSectionMarkdown,
  buildSessionEntityMarkdown,
  parseGeneratorShareMarkdown,
} from "./generator-copy";

describe("generator copy formatting", () => {
  it("exports a spoiler-safe mystery handout without GM lore", () => {
    expect(
      buildMysteryPlayerHandout({
        title: "The Quiet Bell",
        summary: "A keeper vanished before the winter bell.",
        content: "## People to Question\nA clerk saw the ferry leave.",
      }),
    ).toBe(
      "# The Quiet Bell\n\n*A keeper vanished before the winter bell.*\n\n## People to Question\nA clerk saw the ferry leave.",
    );
  });

  it("leaves GM sections out of the player handout", () => {
    const handout = buildMysteryPlayerHandout({
      title: "The Quiet Bell",
      content:
        "## Opening Hook\nA keeper vanished.\n\n## Evidence and Leads\n- Lead 1\n\n## Actual Timeline\n1. The clerk did it.\n\n## Possible Outcomes\n- correct: yes",
    });
    expect(handout).toContain("## Opening Hook");
    expect(handout).toContain("## Evidence and Leads");
    expect(handout).not.toContain("Actual Timeline");
    expect(handout).not.toContain("clerk did it");
    expect(handout).not.toContain("Possible Outcomes");
  });

  it("builds the canonical full-result order", () => {
    expect(
      buildGeneratorMarkdown({
        title: "The Hollow Crown",
        summary: "A fallen order.",
        labels: ["faction", "dark"],
        content: "## Control\n\nThey command the gates.",
        lore: "A sanctuary lies beneath the city.",
      }),
    ).toBe(
      "# The Hollow Crown\n*A fallen order.*\nLabels: faction, dark\n\n## Control\n\nThey command the gates.\n\nA sanctuary lies beneath the city.",
    );
  });

  it("does not duplicate a historical summary already in content", () => {
    const markdown = buildSessionEntityMarkdown({
      id: "history-1",
      type: "faction",
      title: "The Hollow Crown",
      summary: "A fallen order.",
      content: "*A fallen order.*\n\nTheir gates are sealed.",
      lore: "The sanctuary is hidden.",
      labels: ["faction"],
      status: "active",
      reuseEnabled: true,
      pinned: false,
      createdOrder: 1,
    });

    expect(markdown.match(/A fallen order\./g)).toHaveLength(1);
    expect(markdown).toContain("The sanctuary is hidden.");
  });

  it("preserves exactly the trimmed source section", () => {
    expect(buildSectionMarkdown("\n### Hooks\n\n- One\n")).toBe(
      "### Hooks\n\n- One",
    );
  });

  it("removes share-only title, summary, and labels headers when remixing", () => {
    expect(
      parseGeneratorShareMarkdown(
        "# Mara Venn\n*A guide.*\nLabels: npc, ally\n\n## Details\nA watchful guide.",
      ),
    ).toEqual({
      summary: "A guide.",
      content: "## Details\nA watchful guide.",
    });
  });
});
