import { describe, expect, it } from "vitest";
import {
  buildGeneratorMarkdown,
  buildSectionMarkdown,
  buildSessionEntityMarkdown,
} from "./generator-copy";

describe("generator copy formatting", () => {
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
});
