import { describe, expect, it } from "vitest";
import { buildEntityReconciliationPrompt } from "./entity-reconciliation";

describe("buildEntityReconciliationPrompt", () => {
  it("allows richer markdown output for reconciled records", () => {
    const prompt = buildEntityReconciliationPrompt(
      {
        id: "szass-tam",
        title: "Szass Tam",
        type: "npc",
        content: "Old chronicle",
        lore: "Old lore",
      } as any,
      {
        chronicle: "New chronicle",
        lore: "New lore",
      },
      [
        {
          title: "Thay",
          type: "location",
          relation: "rules",
          summary:
            "A dread realm ruled through necromancy and political terror.",
        },
      ],
    );

    expect(prompt).toContain("Markdown is allowed inside both fields.");
    expect(prompt).toContain("short section headings");
    expect(prompt).toContain("bold emphasis");
    expect(prompt).toContain("bullet lists");
    expect(prompt).toContain(
      "Make the lore richer and more complete when the source material supports it.",
    );
    expect(prompt).toContain(
      "Prefer integrating all meaningful incoming details into the updated record.",
    );
    expect(prompt).toContain("Preserve named developments, power shifts");
    expect(prompt).toContain("RELATED ENTITY CONTEXT:");
    expect(prompt).toContain("Thay (location) [rules]");
  });
});
